import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EstatusAccion, TipoAccion } from '@prisma/client';
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
  @ApiProperty({ enum: TipoAccion }) @IsEnum(TipoAccion) tipo_obra!: TipoAccion;
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
  @ApiPropertyOptional({ enum: EstatusAccion, description: 'Solo en creación; cambios posteriores vía POST /acciones/:id/transicion' })
  @IsOptional()
  @IsEnum(EstatusAccion)
  estatus?: EstatusAccion;
  @ApiPropertyOptional() @IsOptional() @IsString() riesgo?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitud?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitud?: number;
  @ApiProperty() @IsUUID() municipio_id!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contratista_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cua?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() id_sisba?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() num_contrato?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() compras_mx_folio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tipo_adjudicacion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fecha_fallo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tipo_localidad?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subcomponente?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() accion_programa_id?: string;
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
  @ApiPropertyOptional() @IsOptional() @IsUUID() entidad_federativa_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() organismo_operador_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() obra_fisica_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() anexo_tecnico_id?: string;
}

export class UpdateObraDto extends PartialType(CreateObraDto) {}
