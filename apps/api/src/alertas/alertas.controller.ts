import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol, Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AlertasService } from './alertas.service';

@ApiTags('Alertas')
@ApiBearerAuth()
@Controller('alertas')
export class AlertasController {
  constructor(private readonly service: AlertasService) {}

  @Get()
  list(
    @CurrentUser() user: Usuario,
    @Query('atendida') atendida?: string,
    @Query('severidad') severidad?: string,
  ) {
    return this.service.findAll(user, {
      atendida: atendida === undefined ? undefined : atendida === 'true',
      severidad,
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.findOne(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  create(@Body() body: Record<string, unknown>, @CurrentUser() user: Usuario) {
    return this.service.create(
      {
        obra_id: body.obra_id as string | undefined,
        municipio: body.municipio as string,
        municipio_id: body.municipio_id as string | undefined,
        titulo: body.titulo as string,
        descripcion: body.descripcion as string,
        tipo: body.tipo as string,
        severidad: body.severidad as string,
        fecha_generacion: body.fecha_generacion as string,
      },
      user,
    );
  }

  @Patch(':id/atender')
  atender(
    @Param('id') id: string,
    @Query('accion_tomada') accionTomada: string,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.atender(id, accionTomada ?? '', user);
  }
}
