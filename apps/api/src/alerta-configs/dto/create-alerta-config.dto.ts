import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export const ALERTA_CONFIG_TIPOS = [
  'sin_actualizaciones',
  'exceso_presupuesto',
  'retraso_fisico',
  'sin_estimaciones',
  'documentacion_incompleta',
] as const;

export const ALERTA_CONFIG_SEVERIDADES = ['baja', 'media', 'alta', 'critica'] as const;

export class DestinatarioDto {
  @ApiProperty()
  @IsUUID()
  user_id!: string;

  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty()
  @IsString()
  telefono!: string;
}

export class CreateAlertaConfigDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @ApiProperty({ enum: ALERTA_CONFIG_TIPOS })
  @IsIn([...ALERTA_CONFIG_TIPOS])
  tipo!: string;

  @ApiPropertyOptional({ enum: ALERTA_CONFIG_SEVERIDADES })
  @IsOptional()
  @IsIn([...ALERTA_CONFIG_SEVERIDADES])
  severidad?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  programa_filtro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  municipio_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  obra_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  umbral_dias?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  umbral_porcentaje?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  umbral_monto?: number;

  @ApiProperty({ type: [DestinatarioDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DestinatarioDto)
  destinatarios!: DestinatarioDto[];
}
