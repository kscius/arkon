import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EstatusObra, Usuario } from '@prisma/client';
import { getApiBrand } from '../common/brand';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

const SUGGESTIONS = [
  'Que obras necesitan atencion urgente ahora?',
  'Cuales son las obras con mayor desfase fisico?',
  'Resumen ejecutivo del portafolio de obras',
  'Cuantas alertas criticas estan sin atender?',
  'Comparativo de avance fisico vs financiero',
];

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly config: ConfigService,
  ) {}

  async ask(message: string, user: Usuario) {
    const trimmed = message.trim();
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();

    if (apiKey) {
      try {
        const response = await this.generateOpenAiResponse(trimmed, user, apiKey);
        return { response, suggestions: SUGGESTIONS };
      } catch (err) {
        this.logger.warn(`OpenAI fallback to local rules: ${(err as Error).message}`);
      }
    }

    const response = await this.generateLocalResponse(trimmed, user);
    return { response, suggestions: SUGGESTIONS };
  }

  private async buildObraContext(user: Usuario): Promise<string> {
    const obraWhere = this.scope.obraWhere(user);
    const obras = await this.prisma.obra.findMany({
      where: obraWhere,
      take: 40,
      orderBy: { avanceFisicoReal: 'asc' },
      include: { municipio: true, contratista: true },
    });

    const alertas = await this.prisma.alerta.findMany({
      where: { ...this.scope.alertaWhere(user), atendida: false },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { obra: { select: { folio: true, nombre: true } } },
    });

    const obraLines = obras.map((o) => {
      const lag = Number(o.avanceFisicoProgramado) - Number(o.avanceFisicoReal);
      return (
        `- ${o.folio} | ${o.nombre} | ${o.municipio.nombre} | estatus=${o.estatus} | ` +
        `avance real ${Number(o.avanceFisicoReal)}% vs prog ${Number(o.avanceFisicoProgramado)}% ` +
        `(desfase ${lag.toFixed(1)} pp) | monto ejercido $${Number(o.montoEjercido).toLocaleString('es-MX')} / ` +
        `contratado $${Number(o.montoContratado).toLocaleString('es-MX')} | riesgo=${o.riesgo}`
      );
    });

    const alertaLines = alertas.map(
      (a) =>
        `- [${a.severidad}] ${a.tipo}: ${a.titulo}` +
        (a.obra ? ` (obra ${a.obra.folio})` : ` (${a.municipio})`),
    );

    const totalObras = obras.length;
    const enEjecucion = obras.filter(
      (o) => o.estatus === EstatusObra.en_ejecucion_a_tiempo,
    ).length;
    const conRetraso = obras.filter((o) => o.estatus === EstatusObra.en_ejecucion_retraso).length;
    const concluidas = obras.filter((o) => o.estatus === EstatusObra.concluida).length;
    const enRiesgo = obras.filter((o) => o.estatus === EstatusObra.en_riesgo).length;
    const montoAutorizadoTotal = obras.reduce((s, o) => s + Number(o.montoAutorizado), 0);
    const avancePromedio =
      totalObras > 0
        ? obras.reduce((s, o) => s + Number(o.avanceFisicoReal), 0) / totalObras
        : 0;

    const resumenLines = [
      'Resumen estadistico:',
      `- Total: ${totalObras} obras | En ejecucion: ${enEjecucion} | Con retraso: ${conRetraso} | Concluidas: ${concluidas} | En riesgo: ${enRiesgo}`,
      `- Monto total autorizado: $${montoAutorizadoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`,
      `- Avance fisico promedio: ${avancePromedio.toFixed(1)}%`,
    ];

    return [
      `Obras en alcance (${obras.length} muestra):`,
      obraLines.join('\n') || '(sin obras)',
      '',
      'Alertas abiertas:',
      alertaLines.join('\n') || '(sin alertas abiertas)',
      '',
      resumenLines.join('\n'),
    ].join('\n');
  }

  private async generateOpenAiResponse(
    message: string,
    user: Usuario,
    apiKey: string,
  ): Promise<string> {
    const context = await this.buildObraContext(user);
    const brand = getApiBrand();
    const systemPrompt = [
      brand.systemPromptIntro,
      'Responde en espanol, de forma clara y accionable para funcionarios publicos.',
      'Incluye analisis de riesgos (retrasos fisicos, desvios financieros, alertas) y recomendaciones concretas.',
      'Usa solo los datos del contexto; si falta informacion, indicalo.',
      'Formato: parrafos breves y listas cuando ayude.',
      'Montos: siempre en pesos mexicanos (MXN) con separadores de miles, formato $X,XXX,XXX.XX MXN.',
      'Porcentajes: usa siempre un decimal (ej. 73.4%).',
      'Tono: analisis directo, sin ambiguedades, basado en datos concretos del contexto; evita frases vagas.',
      'Longitud: respuestas cortas para preguntas simples (1-3 oraciones); detalladas con listas para analisis.',
      'Datos insuficientes: si el contexto no tiene la informacion necesaria, indicalo explicitamente y sugiere que modulo consultar (Obras, Alertas, Contratos o Reportes).',
      '',
      '--- CONTEXTO DEL PORTAFOLIO (alcance del usuario) ---',
      context,
    ].join('\n');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 900,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty OpenAI response');
    return content;
  }

  private async generateLocalResponse(message: string, user: Usuario): Promise<string> {
    const obraWhere = this.scope.obraWhere(user);
    const obras = await this.prisma.obra.findMany({ where: obraWhere });

    const totalObras = obras.length;
    const obrasRetraso = obras.filter((o) => o.estatus === EstatusObra.en_ejecucion_retraso).length;
    const obrasConcluidas = obras.filter((o) => o.estatus === EstatusObra.concluida).length;
    const obrasEjecucion = obras.filter(
      (o) => o.estatus === EstatusObra.en_ejecucion_a_tiempo,
    ).length;
    const obrasRiesgo = obras.filter((o) => o.estatus === EstatusObra.en_riesgo).length;
    const montoTotal = obras.reduce((s, o) => s + Number(o.montoAutorizado), 0);

    const lower = message.toLowerCase();
    const folioMatch = message.match(/(?:obra|proyecto)\s+([A-Z0-9\-]+)/i);
    if (folioMatch) {
      const folio = folioMatch[1];
      const obra = obras.find((o) => o.folio.toLowerCase().includes(folio.toLowerCase()));
      if (obra) {
        return (
          `La obra **${obra.nombre}** (Folio: ${obra.folio}) tiene un avance fisico de ` +
          `**${Number(obra.avanceFisicoReal)}%** y financiero de **${Number(obra.avanceFinanciero)}%**. ` +
          `Su estatus es: **${obra.estatus}**. ` +
          `Monto autorizado: **$${Number(obra.montoAutorizado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}**.`
        );
      }
      return (
        `No encontre una obra con folio similar a '${folio}'. ` +
        'Sugerencias: (1) verifica que el folio este completo (ej. "MUN-2024-001"), ' +
        '(2) puedes buscar por nombre parcial consultando el modulo de Obras con el buscador, ' +
        '(3) escribe "obra [FOLIO]" con el folio exacto tal como aparece en el catalogo.'
      );
    }

    const brand = getApiBrand();

    const avgFisico =
      totalObras > 0
        ? obras.reduce((s, o) => s + Number(o.avanceFisicoReal), 0) / totalObras
        : 0;

    if (['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos'].some((k) => lower.includes(k))) {
      return (
        `Hola, soy **${brand.assistantName}**, tu asistente para la gestion de obras publicas. ` +
        `El portafolio en tu alcance tiene **${totalObras} obras**: avance fisico promedio **${avgFisico.toFixed(1)}%**, ` +
        `**${obrasRetraso} con retraso** y **${obrasRiesgo} en riesgo**. ` +
        'Puedo ayudarte con avances, alertas, contratos, presupuestos y analisis de riesgos. En que puedo ayudarte?'
      );
    }

    if (lower.includes('total') || lower.includes('cuantas obras') || lower.includes('cuantas obra')) {
      return `El sistema registra **${totalObras} obras** en tu alcance.`;
    }

    if (['retras', 'atras', 'desfas'].some((k) => lower.includes(k))) {
      const pctRetraso = totalObras > 0 ? ((obrasRetraso / totalObras) * 100).toFixed(1) : '0.0';
      return (
        `Hay **${obrasRetraso} obras con retraso** (${pctRetraso}% del portafolio). ` +
        'Acciones recomendadas: (1) abre el modulo de Alertas y filtra por severidad ALTA, ' +
        '(2) revisa el desfase fisico de cada obra y solicita informe al contratista, ' +
        '(3) evalua si procede reprogramacion o aplicacion de penalizaciones contractuales.'
      );
    }

    if (['concluid', 'terminad', 'finalizad'].some((k) => lower.includes(k))) {
      return `Hay **${obrasConcluidas} obras concluidas** de ${totalObras} en tu alcance.`;
    }

    if (['riesgo', 'alerta critica', 'urgencia', 'analisis'].some((k) => lower.includes(k))) {
      return (
        `Hay **${obrasRiesgo} obras en riesgo** (retraso fisico o estatus de riesgo directo). ` +
        'Pasos inmediatos: (1) ve al modulo **Alertas** y filtra por severidad CRITICA, ' +
        '(2) en el modulo **Obras** ordena por desfase fisico descendente para identificar las mas criticas, ' +
        '(3) verifica si las obras con desfase mayor a 10 pp tienen contratista activo y fechas de entrega vigentes, ' +
        '(4) genera un reporte ejecutivo desde el modulo Reportes para presentar a la direccion.'
      );
    }

    if (['avance', 'progres', 'avanza'].some((k) => lower.includes(k))) {
      const obrasConDesfase = obras
        .filter((o) => Number(o.avanceFisicoProgramado) - Number(o.avanceFisicoReal) > 0)
        .sort(
          (a, b) =>
            (Number(b.avanceFisicoProgramado) - Number(b.avanceFisicoReal)) -
            (Number(a.avanceFisicoProgramado) - Number(a.avanceFisicoReal)),
        )
        .slice(0, 3);
      const desfaseTop =
        obrasConDesfase.length > 0
          ? ' Las obras con mayor desfase son: ' +
            obrasConDesfase
              .map(
                (o) =>
                  `**${o.folio}** (${(Number(o.avanceFisicoProgramado) - Number(o.avanceFisicoReal)).toFixed(1)} pp)`,
              )
              .join(', ') +
            '.'
          : '';
      return (
        `El avance fisico promedio es **${avgFisico.toFixed(1)}%**. ` +
        `Obras en ejecucion: **${obrasEjecucion}** | Con retraso: **${obrasRetraso}**.` +
        desfaseTop
      );
    }

    if (['financier', 'monto', 'dinero', 'presupuesto'].some((k) => lower.includes(k))) {
      return `El monto total autorizado en tu alcance es de **$${montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN**.`;
    }

    if (
      ['que es arkon', 'que es conagua', 'sigo pem', 'funcion', 'para que sirve'].some((k) =>
        lower.includes(k),
      )
    ) {
      return brand.aboutProductResponse;
    }

    if (
      [
        'programa',
        'fondo',
        'fapaa',
        'camino',
        'proagua',
        'peas',
        'prodder',
        'agua',
        'saneamiento',
        'ptar',
        'macromedicion',
        'devolucion',
      ].some((k) => lower.includes(k))
    ) {
      const programas = [...new Set(obras.map((o) => o.programa))].sort();
      return (
        `Los programas activos en tu alcance son: **${programas.join(', ')}**. ` +
        'Puedes filtrar las obras por programa en el catalogo de obras.'
      );
    }

    return (
      `Tu portafolio tiene **${totalObras} obras**: ${obrasEjecucion} en ejecucion, ${obrasRetraso} con retraso, ${obrasConcluidas} concluidas. ` +
      'Puedo responder preguntas como: ' +
      '"Cuales obras tienen retraso?", ' +
      '"Cual es el avance financiero del portafolio?", ' +
      '"Que alertas criticas estan abiertas?", ' +
      '"Dame informacion de la obra [FOLIO]". ' +
      'Para analisis avanzado, consulta los modulos de Obras, Alertas, Contratos o Reportes.'
    );
  }
}
