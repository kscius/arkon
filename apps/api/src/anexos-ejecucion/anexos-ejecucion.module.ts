import { Module } from '@nestjs/common';
import { AnexosEjecucionController } from './anexos-ejecucion.controller';
import { AnexosEjecucionService } from './anexos-ejecucion.service';

@Module({ controllers: [AnexosEjecucionController], providers: [AnexosEjecucionService] })
export class AnexosEjecucionModule {}
