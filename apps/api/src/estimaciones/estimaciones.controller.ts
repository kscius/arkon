import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EstimacionesService } from './estimaciones.service';

@ApiTags('Estimaciones')
@ApiBearerAuth()
@Controller('estimaciones')
export class EstimacionesController {
  constructor(private readonly service: EstimacionesService) {}

  @Get('accion/:obraId')
  list(@Param('obraId') obraId: string, @CurrentUser() user: Usuario) {
    return this.service.listByObra(obraId, user);
  }

  @Post('accion/:obraId')
  create(
    @Param('obraId') obraId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.create(obraId, body, user);
  }

  @Patch(':id/validate')
  validate(
    @Param('id') id: string,
    @Query('nivel') nivel: 'municipal' | 'estatal',
    @Query('aprobar') aprobar: string,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.validate(id, nivel, aprobar === 'true', user);
  }
}
