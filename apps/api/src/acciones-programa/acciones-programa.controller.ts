import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccionesProgramaService } from './acciones-programa.service';

@ApiTags('Acciones Programa')
@ApiBearerAuth()
@Controller('acciones-programa')
export class AccionesProgramaController {
  constructor(private readonly service: AccionesProgramaService) {}

  @Get()
  @ApiQuery({ name: 'programa', required: false, example: 'PROAGUA' })
  list(@CurrentUser() user: Usuario, @Query('programa') programa?: string) {
    return this.service.findAll(user, programa);
  }
}
