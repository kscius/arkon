import { Module } from '@nestjs/common';
import { AlertaConfigEvaluatorService } from './alerta-config-evaluator.service';
import { AlertaConfigsController } from './alerta-configs.controller';
import { AlertaConfigsService } from './alerta-configs.service';

@Module({
  controllers: [AlertaConfigsController],
  providers: [AlertaConfigsService, AlertaConfigEvaluatorService],
  exports: [AlertaConfigsService, AlertaConfigEvaluatorService],
})
export class AlertaConfigsModule {}
