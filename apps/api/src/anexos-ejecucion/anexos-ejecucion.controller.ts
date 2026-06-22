import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol, Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnexosEjecucionService } from './anexos-ejecucion.service';

@ApiTags('Anexos Ejecucion')
@ApiBearerAuth()
@Controller('anexos-ejecucion')
export class AnexosEjecucionController {
  constructor(private readonly service: AnexosEjecucionService) {}

  @Get()
  list(@CurrentUser() user: Usuario) {
    return this.service.findAll(user);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.findOne(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  create(@Body() body: Record<string, unknown>, @CurrentUser() user: Usuario) {
    return this.service.create(body as Parameters<AnexosEjecucionService['create']>[0], user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  update(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentUser() user: Usuario) {
    return this.service.update(id, body, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal)
  remove(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.remove(id, user);
  }

  @Get(':id/tecnicos')
  listTecnicos(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.listTecnicos(id, user);
  }

  @Post(':id/tecnicos')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  createTecnico(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.createTecnico(id, body as Parameters<AnexosEjecucionService['createTecnico']>[1], user);
  }

  @Patch(':id/tecnicos/:tecnicoId')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  updateTecnico(
    @Param('id') id: string,
    @Param('tecnicoId') tecnicoId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.updateTecnico(id, tecnicoId, body, user);
  }

  @Delete(':id/tecnicos/:tecnicoId')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal)
  removeTecnico(
    @Param('id') id: string,
    @Param('tecnicoId') tecnicoId: string,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.removeTecnico(id, tecnicoId, user);
  }
}
