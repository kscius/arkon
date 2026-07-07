import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstatusAccion } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class TransicionAccionDto {
  @ApiProperty({ enum: EstatusAccion, description: 'Estatus destino de la transición' })
  @IsEnum(EstatusAccion)
  estatus!: EstatusAccion;

  @ApiPropertyOptional({ description: 'Motivo o justificación del cambio de estatus', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
