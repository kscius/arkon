import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol, Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AlertaConfigsService } from './alerta-configs.service';
import { CreateAlertaConfigDto } from './dto/create-alerta-config.dto';
import { UpdateAlertaConfigDto } from './dto/update-alerta-config.dto';

@ApiTags('Alerta Configs')
@ApiBearerAuth()
@Controller('alerta-configs')
@UseGuards(RolesGuard)
@Roles(Rol.estatal, Rol.municipal)
export class AlertaConfigsController {
  constructor(private readonly service: AlertaConfigsService) {}

  @Get()
  list(@CurrentUser() user: Usuario) {
    return this.service.findAll(user);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.findOne(id, user);
  }

  @Post()
  create(@Body() body: CreateAlertaConfigDto, @CurrentUser() user: Usuario) {
    return this.service.create(body, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateAlertaConfigDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.update(id, body, user);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.toggle(id, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.remove(id, user);
  }

  @Post(':id/simular')
  simular(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.simular(id, user);
  }
}
