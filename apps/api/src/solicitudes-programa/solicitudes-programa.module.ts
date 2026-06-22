import { Module } from '@nestjs/common';
import { SolicitudesProgramaController } from './solicitudes-programa.controller';
import { SolicitudesProgramaService } from './solicitudes-programa.service';

@Module({ controllers: [SolicitudesProgramaController], providers: [SolicitudesProgramaService] })
export class SolicitudesProgramaModule {}
