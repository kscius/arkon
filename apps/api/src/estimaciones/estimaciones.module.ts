import { Module } from '@nestjs/common';
import { EstimacionesController } from './estimaciones.controller';
import { EstimacionesService } from './estimaciones.service';

@Module({ controllers: [EstimacionesController], providers: [EstimacionesService] })
export class EstimacionesModule {}
