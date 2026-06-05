import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EstatusObra, EstadoDocumento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PHYSICAL_LAG_THRESHOLD = 10;
const FINANCIAL_GAP_THRESHOLD = 15;
const REQUIRED_DOC_CATEGORIES = ['administrativa', 'tecnica', 'ejecucion'] as const;

@Injectable()
export class AlertasSchedulerService {
  private readonly logger = new Logger(AlertasSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async runScheduledChecks(): Promise<void> {
    this.logger.log('Running automated alert checks');
    await this.checkRetrasoFisico();
    await this.checkDesvioFinanciero();
    await this.checkDocumentacionIncompleta();
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async hasOpenAlert(obraId: string, tipo: string): Promise<boolean> {
    const existing = await this.prisma.alerta.findFirst({
      where: { obraId, tipo, atendida: false },
    });
    return !!existing;
  }

  private async createSystemAlert(data: {
    obraId: string;
    municipio: string;
    municipioId: string;
    titulo: string;
    descripcion: string;
    tipo: string;
    severidad: string;
  }): Promise<void> {
    if (await this.hasOpenAlert(data.obraId, data.tipo)) return;

    await this.prisma.alerta.create({
      data: {
        obraId: data.obraId,
        municipio: data.municipio,
        municipioId: data.municipioId,
        titulo: data.titulo,
        descripcion: data.descripcion,
        tipo: data.tipo,
        severidad: data.severidad,
        fechaGeneracion: this.today(),
        atendida: false,
      },
    });
  }

  private async checkRetrasoFisico(): Promise<void> {
    const obras = await this.prisma.obra.findMany({
      where: {
        estatus: {
          in: [
            EstatusObra.en_ejecucion_a_tiempo,
            EstatusObra.en_ejecucion_retraso,
            EstatusObra.en_riesgo,
          ],
        },
      },
      include: { municipio: true },
    });

    for (const obra of obras) {
      const real = Number(obra.avanceFisicoReal);
      const programado = Number(obra.avanceFisicoProgramado);
      const lag = programado - real;
      if (lag < PHYSICAL_LAG_THRESHOLD) continue;

      const severidad = lag >= 25 ? 'critica' : lag >= 15 ? 'alta' : 'media';
      await this.createSystemAlert({
        obraId: obra.id,
        municipio: obra.municipio.nombre,
        municipioId: obra.municipioId,
        titulo: `Retraso fisico: ${obra.folio}`,
        descripcion: `Avance real ${real}% vs programado ${programado}% (desfase ${lag.toFixed(1)} puntos).`,
        tipo: 'retraso_fisico',
        severidad,
      });
    }
  }

  private async checkDesvioFinanciero(): Promise<void> {
    const obras = await this.prisma.obra.findMany({
      where: {
        estatus: {
          in: [
            EstatusObra.en_ejecucion_a_tiempo,
            EstatusObra.en_ejecucion_retraso,
            EstatusObra.en_riesgo,
          ],
        },
      },
      include: { municipio: true },
    });

    for (const obra of obras) {
      const ejercido = Number(obra.montoEjercido);
      const contratado = Number(obra.montoContratado);
      const autorizado = Number(obra.montoAutorizado);
      const fisico = Number(obra.avanceFisicoReal);
      const financiero = Number(obra.avanceFinanciero);
      const gap = financiero - fisico;

      let reason: string | null = null;
      let severidad = 'media';

      if (contratado > 0 && ejercido > contratado) {
        reason = `Monto ejercido ($${ejercido.toLocaleString('es-MX')}) supera monto contratado ($${contratado.toLocaleString('es-MX')}).`;
        severidad = 'critica';
      } else if (autorizado > 0) {
        const expectedEjercido = (fisico / 100) * autorizado;
        if (ejercido > expectedEjercido * 1.15) {
          reason = `Monto ejercido excede lo esperado segun avance fisico (${fisico}%).`;
          severidad = 'alta';
        }
      }

      if (!reason && gap >= FINANCIAL_GAP_THRESHOLD) {
        reason = `Avance financiero (${financiero}%) supera avance fisico (${fisico}%) por ${gap.toFixed(1)} puntos.`;
        severidad = gap >= 25 ? 'alta' : 'media';
      }

      if (!reason) continue;

      await this.createSystemAlert({
        obraId: obra.id,
        municipio: obra.municipio.nombre,
        municipioId: obra.municipioId,
        titulo: `Desvio financiero: ${obra.folio}`,
        descripcion: reason,
        tipo: 'desvio_financiero',
        severidad,
      });
    }
  }

  private async checkDocumentacionIncompleta(): Promise<void> {
    const obras = await this.prisma.obra.findMany({
      where: {
        estatus: {
          notIn: [EstatusObra.concluida, EstatusObra.cancelada, EstatusObra.cerrada],
        },
      },
      include: { municipio: true, documentos: true },
    });

    for (const obra of obras) {
      const missing = REQUIRED_DOC_CATEGORIES.filter((cat) => {
        const docs = obra.documentos.filter((d) => d.categoria === cat);
        if (docs.length === 0) return true;
        return docs.every(
          (d) => d.estatus === EstadoDocumento.no_cargado || !d.archivo,
        );
      });

      if (missing.length === 0) continue;

      await this.createSystemAlert({
        obraId: obra.id,
        municipio: obra.municipio.nombre,
        municipioId: obra.municipioId,
        titulo: `Documentacion incompleta: ${obra.folio}`,
        descripcion: `Faltan documentos en categorias: ${missing.join(', ')}.`,
        tipo: 'documentacion_incompleta',
        severidad: missing.length >= 2 ? 'alta' : 'media',
      });
    }
  }
}
