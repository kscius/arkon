import { Injectable } from '@nestjs/common';
import { EstatusObra, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

const SUGGESTIONS = [
  'Ver obras en ejecucion',
  'Ver alertas criticas',
  'Ver avance financiero',
];

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async ask(message: string, user: Usuario) {
    const response = await this.generateLocalResponse(message.trim(), user);
    return { response, suggestions: SUGGESTIONS };
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
        'Hola, soy **SIGOPEM AI**, tu asistente para la gestion de obras publicas. ' +
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

    if (['riesgo', 'alerta critica', 'urgencia'].some((k) => lower.includes(k))) {
      return (
        `Hay **${obrasRiesgo} obras en riesgo** (con retraso o en riesgo directo). ` +
        'Se recomienda revision inmediata del panel de alertas.'
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

    if (['que es sigopem', 'sigo pem', 'funcion', 'para que sirve'].some((k) => lower.includes(k))) {
      return (
        '**SIGOPEM** (Sistema Integral de Gestion de Obras Publicas del Estado de Mexico) ' +
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
