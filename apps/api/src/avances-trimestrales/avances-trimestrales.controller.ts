import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol, Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AvancesTrimestralesService } from './avances-trimestrales.service';

@ApiTags('Avances Trimestrales')
@ApiBearerAuth()
@Controller('obras/:obraId/avances-trimestrales')
export class AvancesTrimestralesController {
  constructor(private readonly service: AvancesTrimestralesService) {}

  @Get()
  list(@Param('obraId') obraId: string, @CurrentUser() user: Usuario) {
    return this.service.listByObra(obraId, user);
  }

  @Post()
  create(
    @Param('obraId') obraId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.create(obraId, body as Parameters<AvancesTrimestralesService['create']>[1], user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  update(
    @Param('obraId') obraId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.update(obraId, id, body, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  remove(@Param('obraId') obraId: string, @Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.remove(obraId, id, user);
  }
}
