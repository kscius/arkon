import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol, Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SolicitudesProgramaService } from './solicitudes-programa.service';

@ApiTags('Solicitudes Programa')
@ApiBearerAuth()
@Controller('solicitudes-programa')
export class SolicitudesProgramaController {
  constructor(private readonly service: SolicitudesProgramaService) {}

  @Get()
  @ApiQuery({ name: 'estatus', required: false })
  list(@CurrentUser() user: Usuario, @Query('estatus') estatus?: string) {
    return this.service.findAll(user, estatus);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.findOne(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  create(@Body() body: Record<string, unknown>, @CurrentUser() user: Usuario) {
    return this.service.create(body as Parameters<SolicitudesProgramaService['create']>[0], user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  update(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentUser() user: Usuario) {
    return this.service.update(id, body as Parameters<SolicitudesProgramaService['update']>[1], user);
  }

  @Post(':id/transicion')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  transition(
    @Param('id') id: string,
    @Body() body: { estatus: string; obra_resultante_id?: string },
    @CurrentUser() user: Usuario,
  ) {
    return this.service.transition(id, body.estatus, user, body.obra_resultante_id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  remove(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.remove(id, user);
  }
}
