import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EstatusObra, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

const SUGGESTIONS = [
  'Ver obras en ejecucion',
  'Ver alertas criticas',
  'Ver avance financiero',
  'Analisis de riesgos del portafolio',
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

    return [
      `Obras en alcance (${obras.length} muestra):`,
      obraLines.join('\n') || '(sin obras)',
      '',
      'Alertas abiertas:',
      alertaLines.join('\n') || '(sin alertas abiertas)',
    ].join('\n');
  }

  private async generateOpenAiResponse(
    message: string,
    user: Usuario,
    apiKey: string,
  ): Promise<string> {
    const context = await this.buildObraContext(user);
    const systemPrompt = [
      'Eres ARKON AI, asistente del Sistema Integral de Gestion de Obras Publicas del Estado de Mexico.',
      'Responde en espanol, de forma clara y accionable para funcionarios publicos.',
      'Incluye analisis de riesgos (retrasos fisicos, desvios financieros, alertas) y recomendaciones concretas.',
      'Usa solo los datos del contexto; si falta informacion, indicalo.',
      'Formato: parrafos breves y listas cuando ayude.',
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
      (o) =>
        o.estatus === EstatusObra.en_ejecucion_a_tiempo ||
        o.estatus === EstatusObra.en_ejecucion_retraso,
    ).length;
    const obrasRiesgo = obras.filter(
      (o) =>
        o.estatus === EstatusObra.en_riesgo ||
        o.estatus === EstatusObra.en_ejecucion_retraso,
    ).length;
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
      return `No encontre una obra con folio similar a '${folio}'. Verifique el folio e intente de nuevo.`;
    }

    if (['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos'].some((k) => lower.includes(k))) {
      return (
        'Hola, soy **ARKON AI**, tu asistente para la gestion de obras publicas. ' +
        'Puedo ayudarte con informacion sobre obras, avances, alertas, presupuestos y mas. ' +
        `Actualmente el sistema registra **${totalObras} obras** en tu alcance. En que puedo ayudarte?`
      );
    }

    if (lower.includes('total') || lower.includes('cuantas obras') || lower.includes('cuantas obra')) {
      return `El sistema registra **${totalObras} obras** en tu alcance.`;
    }

    if (['retras', 'atras', 'desfas'].some((k) => lower.includes(k))) {
      return (
        `Actualmente hay **${obrasRetraso} obras con retraso**. ` +
        'Te recomiendo revisar el modulo de Alertas para ver los detalles y tomar acciones correctivas.'
      );
    }

    if (['concluid', 'terminad', 'finalizad'].some((k) => lower.includes(k))) {
      return `Hay **${obrasConcluidas} obras concluidas** de ${totalObras} en tu alcance.`;
    }

    if (['riesgo', 'alerta critica', 'urgencia', 'analisis'].some((k) => lower.includes(k))) {
      return (
        `Hay **${obrasRiesgo} obras en riesgo** (con retraso o en riesgo directo). ` +
        'Se recomienda revision inmediata del panel de alertas y priorizar obras con desfase fisico mayor a 10 puntos.'
      );
    }

    if (['avance', 'progres', 'avanza'].some((k) => lower.includes(k))) {
      const avg =
        totalObras > 0
          ? obras.reduce((s, o) => s + Number(o.avanceFisicoReal), 0) / totalObras
          : 0;
      return (
        `El avance fisico promedio es **${avg.toFixed(1)}%**. ` +
        `Obras en ejecucion: **${obrasEjecucion}**.`
      );
    }

    if (['financier', 'monto', 'dinero', 'presupuesto'].some((k) => lower.includes(k))) {
      return `El monto total autorizado en tu alcance es de **$${montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN**.`;
    }

    if (['que es arkon', 'sigo pem', 'funcion', 'para que sirve'].some((k) => lower.includes(k))) {
      return (
        '**ARKON** (Sistema Integral de Gestion de Obras Publicas del Estado de Mexico) ' +
        'es una plataforma para dar seguimiento a obras publicas financiadas por programas ' +
        'federales y estatales. Permite monitorear avances fisicos y financieros, gestionar ' +
        'alertas, controlar estimaciones y coordinar entre dependencias estatales, municipios y contratistas.'
      );
    }

    if (['programa', 'fondo', 'fapaa', 'camino'].some((k) => lower.includes(k))) {
      const programas = [...new Set(obras.map((o) => o.programa))].sort();
      return (
        `Los programas activos en tu alcance son: **${programas.join(', ')}**. ` +
        'Puedes filtrar las obras por programa en el catalogo de obras.'
      );
    }

    return (
      `Entiendo tu pregunta. En tu alcance hay **${totalObras} obras** registradas, ` +
      `con **${obrasEjecucion} en ejecucion**, **${obrasRetraso} con retraso** y **${obrasConcluidas} concluidas**. ` +
      'Para informacion mas especifica, preguntame sobre una obra por folio o consulta los modulos de Obras y Alertas.'
    );
  }
}
