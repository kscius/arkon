import { Module } from '@nestjs/common';
import { AlertasController } from './alertas.controller';
import { AlertasSchedulerService } from './alertas-scheduler.service';
import { AlertasService } from './alertas.service';

@Module({
  controllers: [AlertasController],
  providers: [AlertasService, AlertasSchedulerService],
})
export class AlertasModule {}
