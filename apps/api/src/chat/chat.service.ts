import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Alerta,
  AvanceMensual,
  Contratista,
  Documento,
  EstatusAccion,
  Estimacion,
  Municipio,
  Observacion,
  Accion,
  Obra,
  Usuario,
} from '@prisma/client';
import { getApiBrand, type TenantId } from '../common/brand';
import { resolveAccionGeoCoords } from '../common/geo';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

const SUGGESTIONS_BY_TENANT: Record<TenantId, string[]> = {
  conagua: [
    'Fisico vs financiero en PROAGUA y PEAS',
    'Detalle PTAR: avances, docs y alertas',
    'Alertas criticas sin atender en saneamiento',
    'Inversion por programa y macromedicion',
    'Estimaciones y documentos pendientes de validar',
    'Acciones PROAGUA en riesgo con enlaces',
  ],
};

function getSuggestions(): string[] {
  return SUGGESTIONS_BY_TENANT[getApiBrand().tenantId];
}

type ChatHistoryMessage = { role: 'user' | 'assistant'; content: string };

type ObraWithRelations = Accion & {
  municipio: Municipio;
  contratista: Contratista | null;
  obraFisica: Obra | null;
};

type AlertaWithObra = Alerta & {
  accion: { id: string; folio: string; nombre: string } | null;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly config: ConfigService,
  ) {}

  async ask(message: string, user: Usuario, history: ChatHistoryMessage[] = []) {
    const trimmed = message.trim();
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();

    if (apiKey) {
      try {
        const response = await this.generateOpenAiResponse(trimmed, user, apiKey, history);
        return { response, suggestions: getSuggestions() };
      } catch (err) {
        this.logger.warn(`OpenAI fallback to local rules: ${(err as Error).message}`);
      }
    }

    const response = await this.generateLocalResponse(trimmed, user);
    return { response, suggestions: getSuggestions() };
  }

  private groupByObraId<T extends { accionId: string }>(items: T[]): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const list = map.get(item.accionId) ?? [];
      list.push(item);
      map.set(item.accionId, list);
    }
    return map;
  }

  private formatMoney(value: number): string {
    return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  }

  private serializeObraLine(o: ObraWithRelations): string {
    const lag = Number(o.avanceFisicoProgramado) - Number(o.avanceFisicoReal);
    const mun = `municipio=${o.municipio.nombre}(id=${o.municipio.id})`;
    const cont = o.contratista
      ? `contratista=${o.contratista.nombre}(id=${o.contratista.id})`
      : 'contratista=(sin asignar)';
    const geo = resolveAccionGeoCoords(o);
    const geoPart = geo ? ` | geo=${geo.latitud},${geo.longitud}` : '';
    const obraFisPart = o.obraFisica
      ? ` | obra_fisica=${o.obraFisica.clave}(id=${o.obraFisica.id})`
      : '';
    return (
      `id=${o.id} | folio=${o.folio} | nombre=${o.nombre} | ${mun} | ${cont}${obraFisPart}${geoPart} | ` +
      `estatus=${o.estatus} | avFis=${Number(o.avanceFisicoReal).toFixed(1)}%/prog=${Number(o.avanceFisicoProgramado).toFixed(1)}%` +
      `(desfase=${lag.toFixed(1)}pp) | avFin=${Number(o.avanceFinanciero).toFixed(1)}% | ` +
      `montoEj=${this.formatMoney(Number(o.montoEjercido))}/cont=${this.formatMoney(Number(o.montoContratado))}` +
      `/aut=${this.formatMoney(Number(o.montoAutorizado))} | riesgo=${o.riesgo} | ` +
      `programa=${o.programa} | inicio=${o.fechaInicio ?? 'N/A'} | termProg=${o.fechaTerminoProgramada ?? 'N/A'}`
    );
  }

  private serializeAvance(a: AvanceMensual): string {
    return (
      `periodo=${a.periodo} estatus=${a.estatus} prog=${Number(a.programado).toFixed(1)}% ` +
      `rep=${Number(a.reportado).toFixed(1)}% val=${a.validado != null ? Number(a.validado).toFixed(1) : 'N/A'}% ` +
      `var=${Number(a.variacion).toFixed(1)}%`
    );
  }

  private serializeEstimacion(e: Estimacion): string {
    return (
      `#${e.numero} periodo=${e.periodo} estatus=${e.estatus} monto=${this.formatMoney(Number(e.montoEstimado))} ` +
      `acum=${this.formatMoney(Number(e.montoAcumulado))} pctFin=${Number(e.porcentajeFinanciero).toFixed(1)}%`
    );
  }

  private serializeDocumento(
    d: Pick<Documento, 'id' | 'categoria' | 'nombre' | 'tipo' | 'estatus' | 'fechaCarga' | 'responsable'>,
  ): string {
    return (
      `id=${d.id} cat=${d.categoria} nombre=${d.nombre} tipo=${d.tipo} estatus=${d.estatus} ` +
      `fecha=${d.fechaCarga ?? 'N/A'} resp=${d.responsable ?? 'N/A'}`
    );
  }

  private serializeObservacion(obs: Observacion): string {
    return (
      `id=${obs.id} tipo=${obs.tipo} sev=${obs.severidad} estatus=${obs.estatus} ` +
      `fecha=${obs.fecha} desc=${obs.descripcion.slice(0, 120)}`
    );
  }

  private async buildRichContext(user: Usuario): Promise<string> {
    const obraWhere = this.scope.obraWhere(user);
    const alertaWhere = this.scope.alertaWhere(user);
    const contratistaWhere = this.scope.contratistaWhere(user);
    const municipioWhere = this.scope.municipioWhere(user);
    const alertaConfigWhere = this.scope.alertaConfigWhere(user);

    const [
      obras,
      alertas,
      avances,
      estimaciones,
      documentos,
      observaciones,
      contratistas,
      municipios,
      programas,
      alertaConfigs,
    ] = await Promise.all([
      this.prisma.accion.findMany({
        where: obraWhere,
        orderBy: { avanceFisicoReal: 'asc' },
        include: { municipio: true, contratista: true, obraFisica: true },
      }),
      this.prisma.alerta.findMany({
        where: alertaWhere,
        orderBy: { createdAt: 'desc' },
        include: { accion: { select: { id: true, folio: true, nombre: true } } },
      }),
      this.prisma.avanceMensual.findMany({
        where: { accion: obraWhere },
        orderBy: { periodo: 'desc' },
      }),
      this.prisma.estimacion.findMany({ where: { accion: obraWhere } }),
      this.prisma.documento.findMany({
        where: { accion: obraWhere },
        select: {
          id: true,
          categoria: true,
          nombre: true,
          tipo: true,
          estatus: true,
          fechaCarga: true,
          responsable: true,
          tamanoBytes: true,
          accionId: true,
        },
      }),
      this.prisma.observacion.findMany({ where: { accion: obraWhere } }),
      this.prisma.contratista.findMany({
        where: contratistaWhere,
        select: { id: true, nombre: true, rfc: true, representante: true, email: true, telefono: true },
      }),
      this.prisma.municipio.findMany({
        where: municipioWhere,
        select: { id: true, nombre: true, latitud: true, longitud: true },
      }),
      this.prisma.programa.findMany({
        select: { id: true, nombre: true, nombreCorto: true, tipo: true, dependencia: true },
      }),
      this.prisma.alertaConfig.findMany({
        where: alertaConfigWhere,
        select: {
          id: true,
          nombre: true,
          tipo: true,
          severidad: true,
          activa: true,
          programaFiltro: true,
          municipioId: true,
          accionId: true,
          umbralDias: true,
          umbralPorcentaje: true,
          umbralMonto: true,
        },
      }),
    ]);

    const avancesByObra = this.groupByObraId(avances);
    const estimacionesByObra = this.groupByObraId(estimaciones);
    const documentosByObra = this.groupByObraId(documentos);
    const observacionesByObra = this.groupByObraId(observaciones);

    const obraSections = obras.map((o) => {
      const lines = [this.serializeObraLine(o)];
      const avs = avancesByObra.get(o.id);
      if (avs?.length) {
        lines.push(`  avances: ${avs.map((a) => this.serializeAvance(a)).join(' | ')}`);
      }
      const ests = estimacionesByObra.get(o.id);
      if (ests?.length) {
        lines.push(`  estimaciones: ${ests.map((e) => this.serializeEstimacion(e)).join(' | ')}`);
      }
      const docs = documentosByObra.get(o.id);
      if (docs?.length) {
        lines.push(`  documentos: ${docs.map((d) => this.serializeDocumento(d)).join(' | ')}`);
      }
      const obss = observacionesByObra.get(o.id);
      if (obss?.length) {
        lines.push(`  observaciones: ${obss.map((obs) => this.serializeObservacion(obs)).join(' | ')}`);
      }
      return lines.join('\n');
    });

    const alertaLines = alertas.map((a: AlertaWithObra) => {
      const obraRef = a.accion
        ? `obra=${a.accion.folio}(id=${a.accion.id})`
        : `municipio=${a.municipio}(id=${a.municipioId ?? 'N/A'})`;
      return (
        `id=${a.id} | [${a.severidad}] ${a.tipo}: ${a.titulo} | ${obraRef} | ` +
        `atendida=${a.atendida} | fecha=${a.fechaGeneracion}` +
        (a.accionTomada ? ` | accion=${a.accionTomada}` : '')
      );
    });

    const contratistaLines = contratistas.map(
      (c) =>
        `id=${c.id} | nombre=${c.nombre} | rfc=${c.rfc} | rep=${c.representante}` +
        (c.email ? ` | email=${c.email}` : '') +
        (c.telefono ? ` | tel=${c.telefono}` : ''),
    );

    const municipioLines = municipios.map(
      (m) =>
        `id=${m.id} | nombre=${m.nombre}` +
        (m.latitud != null ? ` | lat=${Number(m.latitud)}` : '') +
        (m.longitud != null ? ` | lng=${Number(m.longitud)}` : ''),
    );

    const programaLines = programas.map(
      (p) =>
        `id=${p.id} | nombre=${p.nombre} | corto=${p.nombreCorto} | tipo=${p.tipo} | dep=${p.dependencia}`,
    );

    const alertaConfigLines = alertaConfigs.map((c) => {
      const umbrales: string[] = [];
      if (c.umbralDias != null) umbrales.push(`dias=${c.umbralDias}`);
      if (c.umbralPorcentaje != null) umbrales.push(`pct=${Number(c.umbralPorcentaje)}`);
      if (c.umbralMonto != null) umbrales.push(`monto=${this.formatMoney(Number(c.umbralMonto))}`);
      return (
        `id=${c.id} | nombre=${c.nombre} | tipo=${c.tipo} | sev=${c.severidad} | activa=${c.activa}` +
        (c.programaFiltro ? ` | programa=${c.programaFiltro}` : '') +
        (c.municipioId ? ` | municipioId=${c.municipioId}` : '') +
        (c.accionId ? ` | obraId=${c.accionId}` : '') +
        (umbrales.length ? ` | umbrales=${umbrales.join(',')}` : '')
      );
    });

    const totalObras = obras.length;
    const enEjecucion = obras.filter((o) => o.estatus === EstatusAccion.en_ejecucion_a_tiempo).length;
    const conRetraso = obras.filter((o) => o.estatus === EstatusAccion.en_ejecucion_retraso).length;
    const concluidas = obras.filter((o) => o.estatus === EstatusAccion.concluida).length;
    const enRiesgo = obras.filter((o) => o.estatus === EstatusAccion.en_riesgo).length;
    const alertasAbiertas = alertas.filter((a) => !a.atendida).length;
    const montoAutorizadoTotal = obras.reduce((s, o) => s + Number(o.montoAutorizado), 0);
    const avancePromedio =
      totalObras > 0
        ? obras.reduce((s, o) => s + Number(o.avanceFisicoReal), 0) / totalObras
        : 0;

    const term = getApiBrand().entity;

    const resumenLines = [
      'Resumen estadistico:',
      `- Total: ${totalObras} ${term.plural} | En ejecucion: ${enEjecucion} | Con retraso: ${conRetraso} | Concluidas: ${concluidas} | En riesgo: ${enRiesgo}`,
      `- Alertas: ${alertas.length} total (${alertasAbiertas} abiertas, ${alertas.length - alertasAbiertas} atendidas)`,
      `- Monto total autorizado: ${this.formatMoney(montoAutorizadoTotal)} MXN`,
      `- Avance fisico promedio: ${avancePromedio.toFixed(1)}%`,
      `- Avances mensuales: ${avances.length} | Estimaciones: ${estimaciones.length} | Documentos: ${documentos.length} | Observaciones: ${observaciones.length}`,
      `- Contratistas: ${contratistas.length} | Municipios: ${municipios.length} | Programas: ${programas.length} | Config alertas: ${alertaConfigs.length}`,
    ];

    return [
      `${term.pluralCap} en alcance (${obras.length}):`,
      obraSections.join('\n') || `(sin ${term.plural})`,
      '',
      `Alertas (${alertas.length}):`,
      alertaLines.join('\n') || '(sin alertas)',
      '',
      `Contratistas (${contratistas.length}):`,
      contratistaLines.join('\n') || '(sin contratistas)',
      '',
      `Municipios (${municipios.length}):`,
      municipioLines.join('\n') || '(sin municipios)',
      '',
      `Programas (${programas.length}):`,
      programaLines.join('\n') || '(sin programas)',
      '',
      `Configuraciones de alertas (${alertaConfigs.length}):`,
      alertaConfigLines.join('\n') || '(sin configuraciones)',
      '',
      resumenLines.join('\n'),
    ].join('\n');
  }

  private async generateOpenAiResponse(
    message: string,
    user: Usuario,
    apiKey: string,
    history: ChatHistoryMessage[] = [],
  ): Promise<string> {
    const context = await this.buildRichContext(user);
    const brand = getApiBrand();
    const systemPrompt = [
      brand.systemPromptIntro,
      'Responde en espanol, de forma clara y accionable para funcionarios publicos.',
      'Incluye analisis de riesgos (retrasos fisicos, desvios financieros, alertas) y recomendaciones concretas.',
      'Usa solo los datos del contexto; si un dato no existe en el contexto, indicalo explicitamente.',
      'Responde directamente con la informacion disponible; no remitas al usuario a consultar modulos.',
      'Formato: parrafos breves y listas cuando ayude.',
      'Montos: siempre en pesos mexicanos (MXN) con separadores de miles, formato $X,XXX,XXX.XX MXN.',
      'Porcentajes: usa siempre un decimal (ej. 73.4%).',
      'Tono: analisis directo, sin ambiguedades, basado en datos concretos del contexto; evita frases vagas.',
      'Longitud: respuestas cortas para preguntas simples (1-3 oraciones); detalladas con listas para analisis.',
      '',
      'LINKS INTERNOS DEL SISTEMA (formato HashRouter):',
      `- Detalle de ${brand.entity.singular}: /#/acciones/{id}`,
      `- Lista de ${brand.entity.plural}: /#/acciones`,
      '- Alertas: /#/alertas',
      '- Municipio: /#/municipios/{municipioId}',
      '- Contratista: /#/contratistas/{contratistaId}',
      '- Dashboard: /#/dashboard',
      '- Configurador alertas: /#/configurador-alertas',
      `Cuando menciones una ${brand.entity.singular}, municipio, contratista o alerta especifica, SIEMPRE incluye el link directo en formato Markdown: [Nombre](/#/acciones/{id})`,
      'NUNCA digas al usuario que vaya a un modulo o seccion; tu ya tienes todos los datos para responder.',
      '',
      'PROCESOS DEL SISTEMA:',
      '- Avances mensuales: contratistas reportan avance fisico cada mes; flujo estatus: pendiente→en_revision→validado/observado',
      '- Estimaciones: flujo de pago (10 estatus): no_presentada→presentada→en_revision_municipal→observada_municipio→validada_municipio→en_revision_estatal→observada_estado→autorizada→pagada/rechazada',
      '- Alertas: generadas por reglas automaticas (AlertaConfig); se atienden registrando accionTomada; atendida=true las cierra',
      '- Documentos: categorias administrativa/tecnica/ejecucion/cierre/programa; flujo: no_cargado→cargado→en_revision→observado/validado',
      '- Observaciones: emitidas por supervisores sobre incidencias; flujo: abierta→en_atencion→atendida→cerrada',
      '- AlertaConfig: define umbrales (dias retraso, % desfase, monto) que disparan alertas automaticas; puede filtrarse por programa o municipio',
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
        max_tokens: 4000,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10),
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
    const term = getApiBrand().entity;
    const obraWhere = this.scope.obraWhere(user);
    const obras = await this.prisma.accion.findMany({ where: obraWhere });

    const totalObras = obras.length;
    const obrasRetraso = obras.filter((o) => o.estatus === EstatusAccion.en_ejecucion_retraso).length;
    const obrasConcluidas = obras.filter((o) => o.estatus === EstatusAccion.concluida).length;
    const obrasEjecucion = obras.filter(
      (o) => o.estatus === EstatusAccion.en_ejecucion_a_tiempo,
    ).length;
    const obrasRiesgo = obras.filter((o) => o.estatus === EstatusAccion.en_riesgo).length;
    const montoTotal = obras.reduce((s, o) => s + Number(o.montoAutorizado), 0);

    const lower = message.toLowerCase();
    const folioMatch = message.match(/(?:accion|acci\u00f3n|obra|proyecto)\s+([A-Z0-9\-]+)/i);
    if (folioMatch) {
      const folio = folioMatch[1];
      const obra = obras.find((o) => o.folio.toLowerCase().includes(folio.toLowerCase()));
      if (obra) {
        return (
          `La ${term.singular} **[${obra.nombre}](/#/acciones/${obra.id})** (Folio: ${obra.folio}) tiene un avance fisico de ` +
          `**${Number(obra.avanceFisicoReal)}%** y financiero de **${Number(obra.avanceFinanciero)}%**. ` +
          `Su estatus es: **${obra.estatus}**. ` +
          `Monto autorizado: **$${Number(obra.montoAutorizado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}**.`
        );
      }
      return (
        `No encontre una ${term.singular} con folio similar a '${folio}'. ` +
        'Verifica que el folio este completo (ej. "MUN-2024-001") o escribe "accion [FOLIO]" con el folio exacto.'
      );
    }

    const brand = getApiBrand();

    const avgFisico =
      totalObras > 0
        ? obras.reduce((s, o) => s + Number(o.avanceFisicoReal), 0) / totalObras
        : 0;

    if (['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos'].some((k) => lower.includes(k))) {
      return (
        `Hola, soy **${brand.assistantName}**, tu asistente para el seguimiento de las ${term.plural} de los programas hidricos. ` +
        `El portafolio en tu alcance tiene **${totalObras} ${term.plural}**: avance fisico promedio **${avgFisico.toFixed(1)}%**, ` +
        `**${obrasRetraso} con retraso** y **${obrasRiesgo} en riesgo**. ` +
        'Puedo ayudarte con avances, alertas, contratos, presupuestos y analisis de riesgos. En que puedo ayudarte?'
      );
    }

    if (
      lower.includes('total') ||
      lower.includes('cuantas acciones') ||
      lower.includes('cuantas accion') ||
      lower.includes('cuantas obras') ||
      lower.includes('cuantas obra')
    ) {
      return `El sistema registra **${totalObras} ${term.plural}** en tu alcance.`;
    }

    if (['retras', 'atras', 'desfas'].some((k) => lower.includes(k))) {
      const pctRetraso = totalObras > 0 ? ((obrasRetraso / totalObras) * 100).toFixed(1) : '0.0';
      return (
        `Hay **${obrasRetraso} ${term.plural} con retraso** (${pctRetraso}% del portafolio). ` +
        `Revisa el desfase fisico de cada ${term.singular} y solicita informe al contratista; evalua reprogramacion o penalizaciones contractuales si aplica.`
      );
    }

    if (['concluid', 'terminad', 'finalizad'].some((k) => lower.includes(k))) {
      return `Hay **${obrasConcluidas} ${term.plural} concluidas** de ${totalObras} en tu alcance.`;
    }

    if (['riesgo', 'alerta critica', 'urgencia', 'analisis'].some((k) => lower.includes(k))) {
      return (
        `Hay **${obrasRiesgo} ${term.plural} en riesgo** (retraso fisico o estatus de riesgo directo). ` +
        `Prioriza las ${term.plural} con mayor desfase fisico y verifica alertas criticas sin atender en tu alcance.`
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
          ? ` Las ${term.plural} con mayor desfase son: ` +
            obrasConDesfase
              .map(
                (o) =>
                  `[**${o.folio}**](/#/acciones/${o.id}) (${(Number(o.avanceFisicoProgramado) - Number(o.avanceFisicoReal)).toFixed(1)} pp)`,
              )
              .join(', ') +
            '.'
          : '';
      return (
        `El avance fisico promedio es **${avgFisico.toFixed(1)}%**. ` +
        `${term.pluralCap} en ejecucion: **${obrasEjecucion}** | Con retraso: **${obrasRetraso}**.` +
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
      return `Los programas activos en tu alcance son: **${programas.join(', ')}**.`;
    }

    return (
      `Tu portafolio tiene **${totalObras} ${term.plural}**: ${obrasEjecucion} en ejecucion, ${obrasRetraso} con retraso, ${obrasConcluidas} concluidas. ` +
      'Puedo responder preguntas como: ' +
      `"Cuales ${term.plural} tienen retraso?", ` +
      '"Cual es el avance financiero del portafolio?", ' +
      '"Que alertas criticas estan abiertas?", ' +
      `"Dame informacion de la ${term.singular} [FOLIO]".`
    );
  }
}
