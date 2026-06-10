import { Module } from '@nestjs/common';
import { AlertaConfigsModule } from '../alerta-configs/alerta-configs.module';
import { AlertasController } from './alertas.controller';
import { AlertasSchedulerService } from './alertas-scheduler.service';
import { AlertasService } from './alertas.service';

@Module({
  imports: [AlertaConfigsModule],
  controllers: [AlertasController],
  providers: [AlertasService, AlertasSchedulerService],
})
export class AlertasModule {}
