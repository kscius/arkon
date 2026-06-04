import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstatusObservacion, Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ObservacionesService } from './observaciones.service';

@ApiTags('Observaciones')
@ApiBearerAuth()
@Controller('observaciones')
export class ObservacionesController {
  constructor(private readonly service: ObservacionesService) {}

  @Get('obra/:obraId')
  list(@Param('obraId') obraId: string, @CurrentUser() user: Usuario) {
    return this.service.listByObra(obraId, user);
  }

  @Post('obra/:obraId')
  create(
    @Param('obraId') obraId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.create(
      obraId,
      {
        fecha: body.fecha as string,
        tipo: body.tipo as string,
        descripcion: body.descripcion as string,
        severidad: body.severidad as string | undefined,
        responsable: body.responsable as string | undefined,
        fecha_compromiso: body.fecha_compromiso as string | undefined,
      },
      user,
    );
  }

  @Patch(':id')
  updateStatus(
    @Param('id') id: string,
    @Query('estatus') estatus: EstatusObservacion,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.updateStatus(id, estatus, user);
  }
}
