import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol, Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateObraDto, UpdateObraDto } from './dto/obra.dto';
import { ObrasService } from './obras.service';

@ApiTags('Obras')
@ApiBearerAuth()
@Controller('obras')
export class ObrasController {
  constructor(private readonly obras: ObrasService) {}

  @Get('export')
  @ApiQuery({ name: 'format', required: false, enum: ['csv'] })
  exportCsv(
    @CurrentUser() user: Usuario,
    @Res() res: Response,
    @Query('format') format?: string,
    @Query('estatus') estatus?: string,
    @Query('programa') programa?: string,
    @Query('municipio_id') municipio_id?: string,
    @Query('contratista_id') contratista_id?: string,
    @Query('search') search?: string,
  ) {
    const fmt = (format ?? 'csv').toLowerCase();
    if (fmt !== 'csv') {
      return res.status(400).json({ message: 'Only csv format is supported' });
    }
    return this.obras
      .exportCsv(user, { estatus, programa, municipio_id, contratista_id, search })
      .then((csv) => {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="obras-export.csv"');
        res.send(csv);
      });
  }

  @Get()
  list(
    @CurrentUser() user: Usuario,
    @Query('estatus') estatus?: string,
    @Query('programa') programa?: string,
    @Query('municipio_id') municipio_id?: string,
    @Query('contratista_id') contratista_id?: string,
    @Query('search') search?: string,
  ) {
    return this.obras.findAll(user, { estatus, programa, municipio_id, contratista_id, search });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.obras.findOne(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  create(@Body() dto: CreateObraDto, @CurrentUser() user: Usuario) {
    return this.obras.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  update(@Param('id') id: string, @Body() dto: UpdateObraDto, @CurrentUser() user: Usuario) {
    return this.obras.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal)
  remove(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.obras.remove(id, user);
  }
}
