import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AvancesService } from './avances.service';

@ApiTags('Avances')
@ApiBearerAuth()
@Controller('avances')
export class AvancesController {
  constructor(private readonly service: AvancesService) {}

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
    return this.service.create(obraId, body as Parameters<AvancesService['create']>[1], user);
  }

  @Patch(':id')
  validate(
    @Param('id') id: string,
    @Body() body: { validado?: number; comentarios?: string },
    @CurrentUser() user: Usuario,
  ) {
    return this.service.validate(id, body, user);
  }
}
