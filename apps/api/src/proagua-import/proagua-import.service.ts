import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { EstatusObra, Rol, TipoObra, Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ProaguaObraImportRow {
  cua: string;
  folio?: string;
  nombre: string;
  localidad: string;
  programa?: string;
  dependencia?: string;
  tipo_obra?: TipoObra;
  monto_autorizado?: number;
  municipio_id?: string;
  contratista_id?: string;
  subcomponente?: string;
  organismo_operador_id?: string;
  entidad_federativa_id?: string;
  accion_programa_id?: string;
  id_sisba?: string;
  num_contrato?: string;
}

@Injectable()
export class ProaguaImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importObras(
    payload: { obras: ProaguaObraImportRow[] } | ProaguaObraImportRow[],
    user: Usuario,
  ) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    const rows = Array.isArray(payload) ? payload : payload.obras;
    if (!rows?.length) throw new BadRequestException('No obras to import');

    const results: Array<{ cua: string; action: 'created' | 'updated'; id: string }> = [];

    for (const row of rows) {
      if (!row.cua?.trim()) {
        throw new BadRequestException('Each row must have a CUA');
      }
      const cua = row.cua.trim();
      const existing = await this.prisma.obra.findFirst({ where: { cua } });

      const data = {
        folio: row.folio,
        nombre: row.nombre,
        localidad: row.localidad,
        programa: row.programa ?? 'PROAGUA',
        dependencia: row.dependencia ?? 'CONAGUA',
        tipoObra: row.tipo_obra ?? TipoObra.agua_potable,
        montoAutorizado: row.monto_autorizado ?? 0,
        municipioId: row.municipio_id,
        contratistaId: row.contratista_id,
        subcomponente: row.subcomponente,
        organismoOperadorId: row.organismo_operador_id,
        entidadFederativaId: row.entidad_federativa_id,
        accionProgramaId: row.accion_programa_id,
        idSisba: row.id_sisba,
        numContrato: row.num_contrato,
        cua,
      };

      if (existing) {
        const updated = await this.prisma.obra.update({
          where: { id: existing.id },
          data: {
            nombre: data.nombre ?? existing.nombre,
            localidad: data.localidad ?? existing.localidad,
            programa: data.programa,
            dependencia: data.dependencia,
            tipoObra: data.tipoObra,
            montoAutorizado: data.montoAutorizado,
            subcomponente: data.subcomponente,
            organismoOperadorId: data.organismoOperadorId,
            entidadFederativaId: data.entidadFederativaId,
            accionProgramaId: data.accionProgramaId,
            idSisba: data.idSisba,
            numContrato: data.numContrato,
            ...(data.municipioId ? { municipioId: data.municipioId } : {}),
            ...(data.contratistaId ? { contratistaId: data.contratistaId } : {}),
          },
        });
        results.push({ cua, action: 'updated', id: updated.id });
      } else {
        if (!data.nombre || !data.localidad || !data.municipioId) {
          throw new BadRequestException(
            `New obra with CUA ${cua} requires nombre, localidad and municipio_id`,
          );
        }
        const folio =
          data.folio ??
          `PROAGUA-${new Date().getFullYear()}-${cua.replace(/\W/g, '').slice(-6)}`;
        const created = await this.prisma.obra.create({
          data: {
            folio,
            nombre: data.nombre,
            localidad: data.localidad,
            programa: data.programa,
            dependencia: data.dependencia,
            tipoObra: data.tipoObra,
            montoAutorizado: data.montoAutorizado,
            municipioId: data.municipioId!,
            contratistaId: data.contratistaId,
            subcomponente: data.subcomponente,
            organismoOperadorId: data.organismoOperadorId,
            entidadFederativaId: data.entidadFederativaId,
            accionProgramaId: data.accionProgramaId,
            idSisba: data.idSisba,
            numContrato: data.numContrato,
            cua,
            estatus: EstatusObra.en_preparacion,
          },
        });
        results.push({ cua, action: 'created', id: created.id });
      }
    }

    return {
      imported: results.length,
      created: results.filter((r) => r.action === 'created').length,
      updated: results.filter((r) => r.action === 'updated').length,
      results,
    };
  }
}
