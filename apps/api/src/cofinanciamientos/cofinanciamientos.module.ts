import { Module } from '@nestjs/common';
import { CofinanciamientosController, CofinanciamientosObraController } from './cofinanciamientos.controller';
import { CofinanciamientosService } from './cofinanciamientos.service';

@Module({
  controllers: [CofinanciamientosObraController, CofinanciamientosController],
  providers: [CofinanciamientosService],
})
export class CofinanciamientosModule {}
