import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('kpis')
  kpis(@CurrentUser() user: Usuario) {
    return this.service.getKpis(user);
  }

  @Get('pendientes')
  pendientes(@CurrentUser() user: Usuario) {
    return this.service.getPendientes(user);
  }

  @Get('chart/acciones-por-estatus')
  obrasPorEstatus(@CurrentUser() user: Usuario) {
    return this.service.obrasPorEstatus(user);
  }

  @Get('chart/acciones-por-programa')
  obrasPorPrograma(@CurrentUser() user: Usuario) {
    return this.service.obrasPorPrograma(user);
  }

  @Get('chart/top-municipios')
  topMunicipios(@CurrentUser() user: Usuario) {
    return this.service.topMunicipios(user);
  }

  @Get('chart/top-contratistas')
  @ApiQuery({ name: 'programa', required: false })
  topContratistas(@CurrentUser() user: Usuario, @Query('programa') programa?: string) {
    return this.service.topContratistas(user, programa);
  }

  @Get('export/summary')
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'] })
  async exportSummary(
    @CurrentUser() user: Usuario,
    @Res() res: Response,
    @Query('format') format?: string,
  ) {
    const fmt = format === 'csv' ? 'csv' : 'json';
    const data = await this.service.exportSummary(user, fmt);
    if (fmt === 'json') {
      return res.json(data);
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dashboard-summary.csv"');
    return res.send(data);
  }

  @Get('chart/avance-timeline')
  avanceTimeline(@CurrentUser() user: Usuario) {
    return this.service.avanceTimeline(user);
  }
}
