import { Module } from '@nestjs/common';
import { AvancesTrimestralesController } from './avances-trimestrales.controller';
import { AvancesTrimestralesService } from './avances-trimestrales.service';

@Module({ controllers: [AvancesTrimestralesController], providers: [AvancesTrimestralesService] })
export class AvancesTrimestralesModule {}
