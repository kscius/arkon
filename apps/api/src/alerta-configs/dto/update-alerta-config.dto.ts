import { PartialType } from '@nestjs/swagger';
import { CreateAlertaConfigDto } from './create-alerta-config.dto';

export class UpdateAlertaConfigDto extends PartialType(CreateAlertaConfigDto) {}
