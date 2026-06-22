import { Module } from '@nestjs/common';
import { OrganismosOperadoresController } from './organismos-operadores.controller';
import { OrganismosOperadoresService } from './organismos-operadores.service';

@Module({ controllers: [OrganismosOperadoresController], providers: [OrganismosOperadoresService] })
export class OrganismosOperadoresModule {}
