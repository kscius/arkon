import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProaguaExportService } from './proagua-export.service';

@ApiTags('PROAGUA Export')
@ApiBearerAuth()
@Controller('proagua/export')
export class ProaguaExportController {
  constructor(private readonly service: ProaguaExportService) {}

  @Get('anexo-xviii/:obraId')
  async exportAnexoXviii(
    @Param('obraId') obraId: string,
    @CurrentUser() user: Usuario,
    @Res() res: Response,
  ) {
    const buffer = await this.service.exportAnexoXviii(obraId, user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="anexo-xviii-${obraId}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('anexo-ix/:obraId')
  async exportAnexoIx(
    @Param('obraId') obraId: string,
    @CurrentUser() user: Usuario,
    @Res() res: Response,
  ) {
    const buffer = await this.service.exportAnexoIx(obraId, user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="anexo-ix-${obraId}.xlsx"`);
    res.send(buffer);
  }

  @Get('anexo-xxiii/:obraId')
  async exportAnexoXxiii(
    @Param('obraId') obraId: string,
    @CurrentUser() user: Usuario,
    @Res() res: Response,
  ) {
    const buffer = await this.service.exportAnexoXxiii(obraId, user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="anexo-xxiii-${obraId}.xlsx"`);
    res.send(buffer);
  }

  @Get('anexo-xiii/:anexoTecnicoId')
  async exportAnexoXiii(
    @Param('anexoTecnicoId') anexoTecnicoId: string,
    @CurrentUser() user: Usuario,
    @Res() res: Response,
  ) {
    const buffer = await this.service.exportAnexoXiii(anexoTecnicoId, user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="anexo-xiii-${anexoTecnicoId}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('anexo-xxii/:anexoEjecucionId')
  async exportAnexoXxii(
    @Param('anexoEjecucionId') anexoEjecucionId: string,
    @CurrentUser() _user: Usuario,
    @Res() res: Response,
  ) {
    const buffer = await this.service.exportAnexoXxii(anexoEjecucionId, _user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="anexo-xxii-${anexoEjecucionId}.xlsx"`,
    );
    res.send(buffer);
  }
}
