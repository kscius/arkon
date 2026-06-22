import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EntidadesFederativasService } from './entidades-federativas.service';

@ApiTags('Entidades Federativas')
@ApiBearerAuth()
@Controller('entidades-federativas')
export class EntidadesFederativasController {
  constructor(private readonly service: EntidadesFederativasService) {}

  @Get()
  list(@CurrentUser() user: Usuario) {
    return this.service.findAll(user);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.findOne(id, user);
  }
}
