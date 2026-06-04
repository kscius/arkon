import { Module } from '@nestjs/common';
import { ContratistasController } from './contratistas.controller';
import { ContratistasService } from './contratistas.service';

@Module({ controllers: [ContratistasController], providers: [ContratistasService] })
export class ContratistasModule {}
