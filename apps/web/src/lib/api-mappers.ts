import { getBrand } from '@/config/brand';
import type {
  Alerta,
  AvanceMensual,
  Contratista,
  Documento,
  Estimacion,
  MunicipioData,
  Obra,
  Observacion,
  TopContratistaChartRow,
  User,
  UserRole,
} from '@/types';

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '');
}

export function mapUser(raw: {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarInitials: string;
  municipioId?: string | null;
  contratistaId?: string | null;
}): User {
  return {
    id: raw.id,
    name: raw.fullName,
    email: raw.email,
    role: raw.role,
    avatar: raw.avatarInitials,
    municipioId: raw.municipioId ?? undefined,
    contratistaId: raw.contratistaId ?? undefined,
  };
}

export function mapObra(raw: Record<string, unknown>): Obra {
  let evidenciaFotografica: string[] = [];
  const evidencia = raw.evidencia_fotografica;
  if (typeof evidencia === 'string') {
    try {
      evidenciaFotografica = JSON.parse(evidencia) as string[];
    } catch {
      evidenciaFotografica = [];
    }
  } else if (Array.isArray(evidencia)) {
    evidenciaFotografica = evidencia as string[];
  }

  const tipoObra = String(raw.tipo_obra ?? '');
  const tipoPrograma = String(raw.tipo_programa ?? 'federal').toLowerCase();

  return {
    id: String(raw.id),
    folio: String(raw.folio),
    nombre: String(raw.nombre),
    municipio: String(raw.municipio_nombre ?? ''),
    municipioId: raw.municipio_id ? String(raw.municipio_id) : undefined,
    localidad: String(raw.localidad ?? ''),
    programa: String(raw.programa ?? ''),
    tipoPrograma: tipoPrograma === 'estatal' ? 'estatal' : 'federal',
    dependencia: String(raw.dependencia ?? ''),
    tipoObra: tipoObra,
    descripcion: String(raw.descripcion ?? ''),
    poblacionBeneficiada: Number(raw.poblacion_beneficiada ?? 0),
    montoAutorizado: Number(raw.monto_autorizado ?? 0),
    montoContratado: Number(raw.monto_contratado ?? 0),
    montoEjercido: Number(raw.monto_ejercido ?? 0),
    contratista: String(raw.contratista_nombre ?? ''),
    contratistaId: raw.contratista_id ? String(raw.contratista_id) : '',
    supervisor: String(raw.supervisor ?? ''),
    fechaInicio: String(raw.fecha_inicio ?? ''),
    fechaTerminoProgramada: String(raw.fecha_termino_programada ?? ''),
    fechaTerminoReal: raw.fecha_termino_real ? String(raw.fecha_termino_real) : null,
    plazoEjecucion: Number(raw.plazo_ejecucion ?? 0),
    avanceFisicoProgramado: Number(raw.avance_fisico_programado ?? 0),
    avanceFisicoReal: Number(raw.avance_fisico_real ?? 0),
    avanceFinanciero: Number(raw.avance_financiero ?? 0),
    estatus: String(raw.estatus) as Obra['estatus'],
    riesgo: String(raw.riesgo ?? 'bajo') as Obra['riesgo'],
    latitud: Number(raw.latitud ?? 0),
    longitud: Number(raw.longitud ?? 0),
    evidenciaFotografica,
  };
}

export function mapMunicipio(
  raw: Record<string, unknown>,
  color = getBrand().colors.primary,
): MunicipioData {
  return {
    id: String(raw.id),
    nombre: String(raw.nombre),
    obras: Number(raw.obras_count ?? 0),
    inversionTotal: Number(raw.inversion_total ?? 0),
    avanceFisicoPromedio: Number(raw.avance_fisico_promedio ?? 0),
    avanceFinancieroPromedio: Number(raw.avance_financiero_promedio ?? raw.avance_fisico_promedio ?? 0),
    obrasRetrasadas: Number(raw.obras_retrasadas ?? 0),
    obrasConcluidas: Number(raw.obras_concluidas ?? 0),
    programasActivos: Number(raw.programas_activos ?? 0),
    latitud: Number(raw.latitud ?? 0),
    longitud: Number(raw.longitud ?? 0),
    color,
  };
}

export function mapContratista(raw: Record<string, unknown>): Contratista {
  return {
    id: String(raw.id),
    nombre: String(raw.nombre),
    rfc: String(raw.rfc),
    representante: String(raw.representante),
    obrasAsignadas: Number(raw.obras_asignadas ?? 0),
    montoTotal: Number(raw.monto_total ?? 0),
    avancePromedio: Number(raw.avance_promedio ?? 0),
    observacionesPendientes: Number(raw.observaciones_pendientes ?? 0),
  };
}

export function mapAvance(raw: Record<string, unknown>, obraId: string): AvanceMensual {
  return {
    id: String(raw.id),
    obraId,
    periodo: String(raw.periodo),
    programado: Number(raw.programado),
    reportado: Number(raw.reportado),
    validado: raw.validado != null ? Number(raw.validado) : null,
    variacion: Number(raw.variacion),
    estatus: String(raw.estatus) as AvanceMensual['estatus'],
  };
}

export function mapEstimacion(raw: Record<string, unknown>, obraId: string): Estimacion {
  return {
    id: String(raw.id),
    obraId,
    numero: Number(raw.numero),
    periodo: String(raw.periodo),
    montoEstimado: Number(raw.monto_estimado),
    montoAcumulado: Number(raw.monto_acumulado),
    porcentajeFinanciero: Number(raw.porcentaje_financiero),
    estatus: String(raw.estatus) as Estimacion['estatus'],
    fechaPresentacion: String(raw.fecha_presentacion ?? ''),
    fechaRevision: raw.fecha_revision ? String(raw.fecha_revision) : null,
    fechaAutorizacion: raw.fecha_autorizacion ? String(raw.fecha_autorizacion) : null,
    validacionMunicipal: Boolean(raw.validacion_municipal),
    validacionEstatal: Boolean(raw.validacion_estatal),
  };
}

export function mapDocumento(raw: Record<string, unknown>, obraId: string): Documento {
  return {
    id: String(raw.id),
    obraId,
    categoria: String(raw.categoria).toLowerCase() as Documento['categoria'],
    nombre: String(raw.nombre),
    tipo: (String(raw.tipo ?? 'pdf') as Documento['tipo']),
    estatus: String(raw.estatus).toLowerCase() as Documento['estatus'],
    fechaCarga: raw.fechaCarga ? String(raw.fechaCarga) : raw.fecha_carga ? String(raw.fecha_carga) : null,
    responsable: String(raw.responsable ?? ''),
    archivo: raw.archivo ? String(raw.archivo) : null,
  };
}

export function mapObservacion(raw: Record<string, unknown>, obraId: string): Observacion {
  const respuestasRaw = raw.respuestas ?? raw.respuestasJson ?? [];
  const respuestas = Array.isArray(respuestasRaw)
    ? respuestasRaw.map((r: Record<string, unknown>, i: number) => ({
        id: String(r.id ?? `resp-${i}`),
        usuario: String(r.usuario ?? ''),
        fecha: String(r.fecha ?? ''),
        descripcion: String(r.descripcion ?? ''),
      }))
    : [];

  return {
    id: String(raw.id),
    obraId,
    usuarioEmisor: String(raw.usuarioEmisor ?? raw.usuario_emisor ?? ''),
    fecha: String(raw.fecha ?? ''),
    tipo: String(raw.tipo).toLowerCase() as Observacion['tipo'],
    descripcion: String(raw.descripcion ?? ''),
    severidad: String(raw.severidad).toLowerCase() as Observacion['severidad'],
    responsable: String(raw.responsable ?? ''),
    fechaCompromiso: raw.fechaCompromiso ? String(raw.fechaCompromiso) : raw.fecha_compromiso ? String(raw.fecha_compromiso) : null,
    estatus: String(raw.estatus).toLowerCase() as Observacion['estatus'],
    respuestas,
  };
}

export function hasValidGeoCoords(latitud: number, longitud: number): boolean {
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) return false;
  if (latitud === 0 && longitud === 0) return false;
  return Math.abs(latitud) <= 90 && Math.abs(longitud) <= 180;
}

export function obraHasGeo(obra: Pick<Obra, 'latitud' | 'longitud'>): boolean {
  return hasValidGeoCoords(obra.latitud, obra.longitud);
}

export function mapTopContratista(raw: Record<string, unknown>): TopContratistaChartRow {
  return {
    contratista: String(raw.contratista ?? raw.contratista_nombre ?? ''),
    contratistaId:
      raw.contratista_id != null
        ? String(raw.contratista_id)
        : raw.contratistaId != null
          ? String(raw.contratistaId)
          : undefined,
    programa: raw.programa != null ? String(raw.programa) : undefined,
    obrasCount: Number(raw.obras_count ?? raw.obrasCount ?? 0),
    avancePromedio:
      raw.avance_promedio != null
        ? Number(raw.avance_promedio)
        : raw.avancePromedio != null
          ? Number(raw.avancePromedio)
          : undefined,
    montoTotal:
      raw.monto_total != null
        ? Number(raw.monto_total)
        : raw.montoTotal != null
          ? Number(raw.montoTotal)
          : undefined,
  };
}

export function mapAlerta(raw: Record<string, unknown>): Alerta {
  return {
    id: String(raw.id),
    obraId: raw.obra_id ? String(raw.obra_id) : raw.obraId ? String(raw.obraId) : '',
    municipio: String(raw.municipio ?? ''),
    titulo: String(raw.titulo),
    descripcion: String(raw.descripcion ?? ''),
    tipo: String(raw.tipo).toLowerCase(),
    severidad: String(raw.severidad).toLowerCase() as Alerta['severidad'],
    fechaGeneracion: String(raw.fecha_generacion ?? raw.fechaGeneracion ?? ''),
    atendida: Boolean(raw.atendida),
    accionTomada:
      raw.accion_tomada != null
        ? String(raw.accion_tomada)
        : raw.accionTomada != null
          ? String(raw.accionTomada)
          : null,
  };
}
