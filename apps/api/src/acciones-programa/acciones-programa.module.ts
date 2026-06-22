import { Module } from '@nestjs/common';
import { AccionesProgramaController } from './acciones-programa.controller';
import { AccionesProgramaService } from './acciones-programa.service';

@Module({ controllers: [AccionesProgramaController], providers: [AccionesProgramaService] })
export class AccionesProgramaModule {}
