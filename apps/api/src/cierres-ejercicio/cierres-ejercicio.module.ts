import { Module } from '@nestjs/common';
import { CierresEjercicioController } from './cierres-ejercicio.controller';
import { CierresEjercicioService } from './cierres-ejercicio.service';

@Module({ controllers: [CierresEjercicioController], providers: [CierresEjercicioService] })
export class CierresEjercicioModule {}
