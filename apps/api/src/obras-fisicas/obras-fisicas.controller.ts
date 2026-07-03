import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol, Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateObraFisicaDto, UpdateObraFisicaDto } from './dto/obra-fisica.dto';
import { ObrasFisicasService } from './obras-fisicas.service';

@ApiTags('Obras')
@ApiBearerAuth()
@Controller('obras')
export class ObrasFisicasController {
  constructor(private readonly obrasFisicas: ObrasFisicasService) {}

  @Get()
  @ApiQuery({ name: 'estatus_fisico', required: false })
  @ApiQuery({ name: 'municipio_id', required: false })
  @ApiQuery({ name: 'search', required: false })
  list(
    @CurrentUser() user: Usuario,
    @Query('estatus_fisico') estatus_fisico?: string,
    @Query('municipio_id') municipio_id?: string,
    @Query('search') search?: string,
  ) {
    return this.obrasFisicas.findAll(user, { estatus_fisico, municipio_id, search });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.obrasFisicas.findOne(id, user);
  }

  @Get(':id/acciones')
  listAcciones(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.obrasFisicas.listAcciones(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  create(@Body() dto: CreateObraFisicaDto, @CurrentUser() user: Usuario) {
    return this.obrasFisicas.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateObraFisicaDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.obrasFisicas.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal)
  remove(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.obrasFisicas.remove(id, user);
  }
}
