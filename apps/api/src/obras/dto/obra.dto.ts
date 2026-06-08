import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EstatusObra, TipoObra } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateObraDto {
  @ApiPropertyOptional({ description: 'Se genera automáticamente si se omite' })
  @IsOptional()
  @IsString()
  folio?: string;
  @ApiProperty() @IsString() nombre!: string;
  @ApiProperty() @IsString() localidad!: string;
  @ApiProperty() @IsString() programa!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tipo_programa?: string;
  @ApiProperty() @IsString() dependencia!: string;
  @ApiProperty({ enum: TipoObra }) @IsEnum(TipoObra) tipo_obra!: TipoObra;
  @ApiPropertyOptional() @IsOptional() @IsString() descripcion?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() poblacion_beneficiada?: number;
  @ApiProperty() @IsNumber() monto_autorizado!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() monto_contratado?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() monto_ejercido?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() supervisor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fecha_inicio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fecha_termino_programada?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() plazo_ejecucion?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() avance_fisico_programado?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() avance_fisico_real?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() avance_financiero?: number;
  @ApiPropertyOptional({ enum: EstatusObra }) @IsOptional() @IsEnum(EstatusObra) estatus?: EstatusObra;
  @ApiPropertyOptional() @IsOptional() @IsString() riesgo?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitud?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitud?: number;
  @ApiProperty() @IsUUID() municipio_id!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contratista_id?: string;
}

export class UpdateObraDto extends PartialType(CreateObraDto) {}
