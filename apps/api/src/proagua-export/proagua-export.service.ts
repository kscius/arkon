import { Injectable, NotFoundException } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProaguaExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async exportAnexoXviii(obraId: string, user: Usuario): Promise<Buffer> {
    const obra = await this.scope.getObraOrThrow(obraId, user);
    const avances = await this.prisma.avanceTrimestral.findMany({
      where: { accionId: obraId },
      orderBy: [{ ejercicioFiscal: 'asc' }, { trimestre: 'asc' }],
    });

    const wb = new Workbook();
    const ws = wb.addWorksheet('Anexo XVIII');

    ws.addRow(['INFORME TRIMESTRAL DE AVANCES - ANEXO XVIII']);
    ws.addRow(['CUA', obra.cua ?? '']);
    ws.addRow(['Folio', obra.folio]);
    ws.addRow(['Nombre de la obra', obra.nombre]);
    ws.addRow(['Programa', obra.programa]);
    ws.addRow([]);

    const header = [
      'Ejercicio',
      'Trimestre',
      'Avance fisico anterior (%)',
      'Avance fisico trimestre (%)',
      'Avance fisico acumulado (%)',
      'Avance fin. anterior (MXN)',
      'Avance fin. trimestre (MXN)',
      'Avance fin. acumulado (MXN)',
      'Fecha entrega',
      'Estatus',
      'Observaciones',
    ];
    ws.addRow(header);

    for (const a of avances) {
      ws.addRow([
        a.ejercicioFiscal,
        a.trimestre,
        Number(a.avanceFisicoAnterior),
        Number(a.avanceFisicoTrimestre),
        Number(a.avanceFisicoAcumulado),
        Number(a.avanceFinAnterior),
        Number(a.avanceFinTrimestre),
        Number(a.avanceFinAcumulado),
        a.fechaEntrega ?? '',
        a.estatus,
        a.observaciones,
      ]);
    }

    ws.getRow(7).font = { bold: true };
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportAnexoIx(obraId: string, user: Usuario): Promise<Buffer> {
    const obra = await this.prisma.accion.findFirst({
      where: { id: obraId, ...this.scope.obraWhere(user) },
      include: {
        entidadFederativa: true,
        organismoOperador: true,
        accionPrograma: true,
        municipio: true,
        cofinanciamientos: true,
      },
    });
    if (!obra) throw new NotFoundException('Obra not found');

    const wb = new Workbook();
    const ws = wb.addWorksheet('Anexo IX');
    ws.addRow(['FICHA TECNICA DE ACCIONES - ANEXO IX']);
    const rows: [string, string | number][] = [
      ['CUA', obra.cua ?? ''],
      ['Folio', obra.folio],
      ['Nombre', obra.nombre],
      ['Localidad', obra.localidad],
      ['Municipio', obra.municipio.nombre],
      ['Entidad', obra.entidadFederativa?.nombre ?? ''],
      ['Organismo operador', obra.organismoOperador?.nombre ?? ''],
      ['Programa', obra.programa],
      ['Subcomponente', obra.subcomponente ?? ''],
      ['Tipo localidad', obra.tipoLocalidad ?? ''],
      ['Accion catalogo', obra.accionPrograma?.clave ?? ''],
      ['Cobertura AP antes (%)', Number(obra.coberturaApAntes ?? 0)],
      ['Cobertura AP meta (%)', Number(obra.coberturaApMeta ?? 0)],
      ['Cobertura TAR antes (%)', Number(obra.coberturaTarAntes ?? 0)],
      ['Cobertura TAR meta (%)', Number(obra.coberturaTarMeta ?? 0)],
      ['Caudal (LPS)', Number(obra.caudalLps ?? 0)],
      ['Poblacion incorporar', obra.pobIncorporar ?? 0],
      ['Poblacion mejorar', obra.pobMejorar ?? 0],
      ['Mujeres beneficiadas', obra.pobMujeres ?? 0],
      ['Indigena', obra.pobIndigena ?? 0],
      ['Afromexicano', obra.pobAfromexicano ?? 0],
      ['Monto autorizado (MXN)', Number(obra.montoAutorizado)],
    ];
    for (const [k, v] of rows) ws.addRow([k, v]);
    ws.addRow([]);
    ws.addRow(['Cofinanciamiento', 'Monto (MXN)', '%']);
    for (const c of obra.cofinanciamientos) {
      ws.addRow([c.fuente, Number(c.monto), Number(c.porcentaje)]);
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async exportAnexoXxiii(obraId: string, user: Usuario): Promise<Buffer> {
    const obra = await this.scope.getObraOrThrow(obraId, user);
    const wb = new Workbook();
    const ws = wb.addWorksheet('Anexo XXIII');
    ws.addRow(['INFORME FINAL DE ACCIONES - ANEXO XXIII']);
    ws.addRow(['CUA', obra.cua ?? '']);
    ws.addRow(['ID SISBA', obra.idSisba ?? '']);
    ws.addRow(['Nombre', obra.nombre]);
    ws.addRow(['Estatus', obra.estatus]);
    ws.addRow(['Avance fisico real (%)', Number(obra.avanceFisicoReal)]);
    ws.addRow(['Avance financiero (%)', Number(obra.avanceFinanciero)]);
    ws.addRow(['Monto ejercido (MXN)', Number(obra.montoEjercido)]);
    ws.addRow(['Monto autorizado (MXN)', Number(obra.montoAutorizado)]);
    ws.addRow(['Poblacion beneficiada', obra.poblacionBeneficiada]);
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async exportAnexoXxii(anexoEjecucionId: string, user: Usuario): Promise<Buffer> {
    const anexo = await this.prisma.anexoEjecucion.findUniqueOrThrow({
      where: { id: anexoEjecucionId },
      include: { cierresEjercicio: true },
    });
    const wb = new Workbook();
    const ws = wb.addWorksheet('Anexo XXII');
    ws.addRow(['CIERRE DE EJERCICIO FISCAL - ANEXO XXII']);
    ws.addRow(['Numero anexo', anexo.numero]);
    ws.addRow(['Ejercicio', anexo.ejercicioFiscal]);
    ws.addRow(['Entidad', anexo.entidadFederativa]);
    ws.addRow(['Monto federal', Number(anexo.montoFederal)]);
    ws.addRow(['Monto estatal', Number(anexo.montoEstatal)]);
    ws.addRow([]);
    ws.addRow(['Tipo apoyo', 'Transferido', 'Reintegrado ej.', 'Informe final', 'Por reintegrar']);
    for (const c of anexo.cierresEjercicio) {
      ws.addRow([
        c.tipoApoyo,
        Number(c.montoTransferido),
        Number(c.montoReintegradoEj),
        Number(c.montoInformeFinal),
        Number(c.montoPorReintegrar),
      ]);
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async exportAnexoXiii(anexoTecnicoId: string, user: Usuario): Promise<Buffer> {
    const anexo = await this.prisma.anexoTecnico.findUnique({
      where: { id: anexoTecnicoId },
      include: {
        anexoEjecucion: true,
        organismoOperador: true,
        acciones: {
          where: this.scope.obraWhere(user),
          include: {
            municipio: true,
            cofinanciamientos: true,
          },
          orderBy: { folio: 'asc' },
        },
      },
    });
    if (!anexo) throw new NotFoundException('Anexo tecnico not found');

    const wb = new Workbook();
    const ws = wb.addWorksheet('Anexo XIII');
    ws.addRow(['ANEXO TECNICO POR EJECUTOR - ANEXO XIII']);
    ws.addRow(['Anexo ejecucion', anexo.anexoEjecucion.numero]);
    ws.addRow(['Ejercicio fiscal', anexo.ejercicioFiscal]);
    ws.addRow(['Tipo localidad', anexo.tipoLocalidad]);
    ws.addRow(['Organismo operador', anexo.organismoOperador?.nombre ?? '']);
    ws.addRow(['Estatus', anexo.estatus]);
    ws.addRow([]);
    const header = [
      'CUA',
      'Folio',
      'Nombre',
      'Municipio',
      'Localidad',
      'Programa',
      'Subcomponente',
      'Monto autorizado (MXN)',
      'Avance fisico (%)',
      'Avance financiero (%)',
      'Estatus',
    ];
    ws.addRow(header);
    ws.getRow(8).font = { bold: true };

    for (const obra of anexo.acciones) {
      ws.addRow([
        obra.cua ?? '',
        obra.folio,
        obra.nombre,
        obra.municipio.nombre,
        obra.localidad,
        obra.programa,
        obra.subcomponente ?? '',
        Number(obra.montoAutorizado),
        Number(obra.avanceFisicoReal),
        Number(obra.avanceFinanciero),
        obra.estatus,
      ]);
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
