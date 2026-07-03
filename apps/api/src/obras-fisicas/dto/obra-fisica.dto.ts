import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EstatusFisicoObra, TipoAccion } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateObraFisicaDto {
  @ApiPropertyOptional({ description: 'Se genera como OBRA-{clave} si se omite' })
  @IsOptional()
  @IsString()
  clave?: string;
  @ApiProperty() @IsString() nombre!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descripcion?: string;
  @ApiProperty({ enum: TipoAccion }) @IsEnum(TipoAccion) tipo_obra!: TipoAccion;
  @ApiProperty() @IsString() localidad!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tipo_localidad?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitud?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitud?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() poblacion_beneficiada?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cobertura_ap_antes?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cobertura_ap_meta?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cobertura_tar_antes?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cobertura_tar_meta?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() caudal_lps?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pob_incorporar?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pob_mejorar?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pob_mujeres?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pob_indigena?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pob_afromexicano?: number;
  @ApiPropertyOptional({ enum: EstatusFisicoObra })
  @IsOptional()
  @IsEnum(EstatusFisicoObra)
  estatus_fisico?: EstatusFisicoObra;
  @ApiProperty() @IsUUID() municipio_id!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() entidad_federativa_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() organismo_operador_id?: string;
}

export class UpdateObraFisicaDto extends PartialType(CreateObraFisicaDto) {}
