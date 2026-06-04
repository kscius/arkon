import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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

  @Get('chart/obras-por-estatus')
  obrasPorEstatus(@CurrentUser() user: Usuario) {
    return this.service.obrasPorEstatus(user);
  }

  @Get('chart/obras-por-programa')
  obrasPorPrograma(@CurrentUser() user: Usuario) {
    return this.service.obrasPorPrograma(user);
  }

  @Get('chart/top-municipios')
  topMunicipios(@CurrentUser() user: Usuario) {
    return this.service.topMunicipios(user);
  }

  @Get('chart/avance-timeline')
  avanceTimeline(@CurrentUser() user: Usuario) {
    return this.service.avanceTimeline(user);
  }
}
