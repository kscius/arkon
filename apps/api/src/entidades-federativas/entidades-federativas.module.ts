import { Module } from '@nestjs/common';
import { EntidadesFederativasController } from './entidades-federativas.controller';
import { EntidadesFederativasService } from './entidades-federativas.service';

@Module({ controllers: [EntidadesFederativasController], providers: [EntidadesFederativasService] })
export class EntidadesFederativasModule {}
