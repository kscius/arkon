import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol, Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CierresEjercicioService } from './cierres-ejercicio.service';

@ApiTags('Cierres Ejercicio')
@ApiBearerAuth()
@Controller('cierres-ejercicio')
export class CierresEjercicioController {
  constructor(private readonly service: CierresEjercicioService) {}

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
    return this.service.create(body as Parameters<CierresEjercicioService['create']>[0], user);
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
}
