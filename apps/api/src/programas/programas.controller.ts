import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProgramasService } from './programas.service';

@ApiTags('Programas')
@ApiBearerAuth()
@Controller('programas')
export class ProgramasController {
  constructor(private readonly programas: ProgramasService) {}

  @Get()
  list(@CurrentUser() user: Usuario) {
    return this.programas.listOverview(user);
  }

  @Get(':id/acciones')
  listAcciones(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.programas.getProgramaAcciones(user, id);
  }
}
