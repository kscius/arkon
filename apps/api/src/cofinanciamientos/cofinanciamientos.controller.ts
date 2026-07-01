import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol, Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CofinanciamientosService } from './cofinanciamientos.service';

@ApiTags('Cofinanciamientos')
@ApiBearerAuth()
@Controller('acciones/:obraId/cofinanciamientos')
export class CofinanciamientosObraController {
  constructor(private readonly service: CofinanciamientosService) {}

  @Get()
  list(@Param('obraId') obraId: string, @CurrentUser() user: Usuario) {
    return this.service.listByObra(obraId, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  create(
    @Param('obraId') obraId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.create(obraId, body as Parameters<CofinanciamientosService['create']>[1], user);
  }
}

@ApiTags('Cofinanciamientos')
@ApiBearerAuth()
@Controller('cofinanciamientos')
export class CofinanciamientosController {
  constructor(private readonly service: CofinanciamientosService) {}

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.update(id, body as Parameters<CofinanciamientosService['update']>[1], user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  remove(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.remove(id, user);
  }
}
