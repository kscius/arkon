import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Rol, Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProaguaImportService, ProaguaObraImportRow } from './proagua-import.service';

@ApiTags('PROAGUA Import')
@ApiBearerAuth()
@Controller('proagua/import')
export class ProaguaImportController {
  constructor(private readonly service: ProaguaImportService) {}

  @Post('obras')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  importJson(
    @Body() body: { obras: ProaguaObraImportRow[] } | ProaguaObraImportRow[],
    @CurrentUser() user: Usuario,
  ) {
    return this.service.importObras(body, user);
  }

  @Post('obras/csv')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async importCsv(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: Usuario) {
    if (!file?.buffer) {
      return this.service.importObras({ obras: [] }, user);
    }
    const text = file.buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      return this.service.importObras({ obras: [] }, user);
    }
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const obras: ProaguaObraImportRow[] = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? '';
      });
      return {
        cua: row.cua,
        folio: row.folio || undefined,
        nombre: row.nombre,
        localidad: row.localidad,
        programa: row.programa || undefined,
        dependencia: row.dependencia || undefined,
        monto_autorizado: row.monto_autorizado ? Number(row.monto_autorizado) : undefined,
        municipio_id: row.municipio_id || undefined,
        contratista_id: row.contratista_id || undefined,
        subcomponente: row.subcomponente || undefined,
        organismo_operador_id: row.organismo_operador_id || undefined,
        entidad_federativa_id: row.entidad_federativa_id || undefined,
      };
    });
    return this.service.importObras({ obras }, user);
  }
}
