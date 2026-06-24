import {
  apiFetch,
  apiFetchBlob,
  apiFetchFormData,
  documentoFileUrl,
  getToken,
  setToken,
  triggerBlobDownload,
} from '@/lib/api-client';
import {
  mapAlerta,
  mapAccionPrograma,
  mapAnexoEjecucion,
  mapAnexoTecnico,
  mapAvance,
  mapAvanceTrimestral,
  mapCierreEjercicio,
  mapCofinanciamiento,
  mapContratista,
  mapDocumento,
  mapEntidadFederativa,
  mapEstimacion,
  mapMunicipio,
  mapObra,
  mapObservacion,
  mapOrganismoOperador,
  mapSolicitudPrograma,
  mapTopContratista,
  mapUser,
} from '@/lib/api-mappers';
import type {
  AccionPrograma,
  Alerta,
  AlertaConfig,
  AlertaConfigDestinatario,
  AlertaConfigTipo,
  AdminUser,
  AnexoEjecucion,
  AnexoTecnico,
  AvanceTrimestral,
  CierreEjercicio,
  Cofinanciamiento,
  Contratista,
  Documento,
  EntidadFederativa,
  MunicipioData,
  Obra,
  OrganismoOperador,
  ProaguaImportResult,
  Severidad,
  SolicitudPrograma,
  TopContratistaChartRow,
  User,
} from '@/types';

import { getMunicipioChartColors } from '@/config/brand';

export type { AdminUser } from '@/types';

export async function login(email: string, password: string): Promise<User> {
  const res = await apiFetch<{
    access_token: string;
    user: Parameters<typeof mapUser>[0];
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(res.access_token);
  return mapUser(res.user);
}

export async function fetchMe(): Promise<User> {
  const res = await apiFetch<Parameters<typeof mapUser>[0]>('/auth/me');
  return mapUser(res);
}

export async function fetchObras(): Promise<Obra[]> {
  const rows = await apiFetch<Record<string, unknown>[]>('/obras');
  return rows.map(mapObra);
}

export async function fetchObra(id: string): Promise<Obra> {
  const row = await apiFetch<Record<string, unknown>>(`/obras/${id}`);
  return mapObra(row);
}

export interface CreateObraInput {
  folio?: string;
  nombre: string;
  localidad: string;
  programa: string;
  tipo_programa?: string;
  dependencia: string;
  tipo_obra: string;
  descripcion?: string;
  poblacion_beneficiada?: number;
  monto_autorizado: number;
  monto_contratado?: number;
  monto_ejercido?: number;
  supervisor?: string;
  fecha_inicio?: string;
  fecha_termino_programada?: string;
  plazo_ejecucion?: number;
  avance_fisico_programado?: number;
  avance_fisico_real?: number;
  avance_financiero?: number;
  estatus?: string;
  riesgo?: string;
  latitud?: number;
  longitud?: number;
  municipio_id: string;
  contratista_id?: string;
  cua?: string;
  id_sisba?: string;
  num_contrato?: string;
  compras_mx_folio?: string;
  tipo_adjudicacion?: string;
  fecha_fallo?: string;
  subcomponente?: string;
  tipo_localidad?: string;
  cobertura_ap_antes?: number;
  cobertura_ap_meta?: number;
  cobertura_tar_antes?: number;
  cobertura_tar_meta?: number;
  caudal_lps?: number;
  pob_incorporar?: number;
  pob_mejorar?: number;
  pob_mujeres?: number;
  pob_indigena?: number;
  pob_afromexicano?: number;
  entidad_federativa_id?: string;
  organismo_operador_id?: string;
  accion_programa_id?: string;
  anexo_tecnico_id?: string;
}

export type UpdateObraInput = Partial<CreateObraInput>;

export async function createObra(body: CreateObraInput): Promise<Obra> {
  const row = await apiFetch<Record<string, unknown>>('/obras', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapObra(row);
}

export async function updateObra(id: string, body: UpdateObraInput): Promise<Obra> {
  const row = await apiFetch<Record<string, unknown>>(`/obras/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return mapObra(row);
}

export interface CreateContratistaInput {
  nombre: string;
  rfc: string;
  representante: string;
  email?: string;
  telefono?: string;
  registro_padron?: string;
}

export async function createContratista(body: CreateContratistaInput): Promise<Contratista> {
  const row = await apiFetch<Record<string, unknown>>('/contratistas', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapContratista(row);
}

function mapAdminUser(row: Record<string, unknown>): AdminUser {
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: String(row.full_name ?? row.fullName ?? ''),
    role: String(row.role ?? row.rol) as User['role'],
    rolConagua:
      row.rol_conagua != null
        ? String(row.rol_conagua)
        : row.rolConagua != null
          ? String(row.rolConagua)
          : null,
    avatarInitials: String(row.avatar_initials ?? row.avatarInitials ?? 'US'),
    municipioId: row.municipio_id != null ? String(row.municipio_id) : undefined,
    contratistaId: row.contratista_id != null ? String(row.contratista_id) : undefined,
    isActive: row.is_active !== false && row.isActive !== false,
    telefono: row.telefono != null ? String(row.telefono) : null,
  };
}

function mapAlertaConfig(row: Record<string, unknown>): AlertaConfig {
  const rawDest = row.destinatarios;
  const destinatarios: AlertaConfigDestinatario[] = Array.isArray(rawDest)
    ? rawDest.map((d) => {
        const item = d as Record<string, unknown>;
        return {
          userId: String(item.userId ?? item.user_id ?? ''),
          nombre: String(item.nombre ?? ''),
          telefono: String(item.telefono ?? ''),
        };
      })
    : [];

  return {
    id: String(row.id),
    nombre: String(row.nombre ?? ''),
    descripcion: row.descripcion != null ? String(row.descripcion) : null,
    activa: row.activa !== false,
    tipo: String(row.tipo) as AlertaConfigTipo,
    severidad: String(row.severidad ?? 'media') as Severidad,
    programaFiltro: row.programa_filtro != null ? String(row.programa_filtro) : null,
    municipioId: row.municipio_id != null ? String(row.municipio_id) : null,
    municipioNombre: row.municipio_nombre != null ? String(row.municipio_nombre) : null,
    obraId: row.obra_id != null ? String(row.obra_id) : null,
    obraNombre: row.obra_nombre != null ? String(row.obra_nombre) : null,
    obraFolio: row.obra_folio != null ? String(row.obra_folio) : null,
    umbralDias: row.umbral_dias != null ? Number(row.umbral_dias) : null,
    umbralPorcentaje: row.umbral_porcentaje != null ? Number(row.umbral_porcentaje) : null,
    umbralMonto: row.umbral_monto != null ? Number(row.umbral_monto) : null,
    destinatarios,
    creadoPor: String(row.creado_por ?? ''),
    creadorNombre: row.creador_nombre != null ? String(row.creador_nombre) : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const rows = await apiFetch<Record<string, unknown>[]>('/users');
  return rows.map(mapAdminUser);
}

export interface CreateUserInput {
  email: string;
  password: string;
  full_name: string;
  role: User['role'];
  avatar_initials?: string;
  municipio_id?: string;
  contratista_id?: string;
  telefono?: string;
  rol_conagua?: string;
}

export async function createUser(body: CreateUserInput): Promise<AdminUser> {
  const row = await apiFetch<Record<string, unknown>>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapAdminUser(row);
}

export interface UpdateUserInput {
  isActive?: boolean;
  full_name?: string;
  telefono?: string | null;
  rol_conagua?: string | null;
}

export async function updateUser(id: string, body: UpdateUserInput): Promise<AdminUser> {
  const payload: Record<string, unknown> = {};
  if (body.isActive !== undefined) payload.is_active = body.isActive;
  if (body.full_name !== undefined) payload.full_name = body.full_name;
  if (body.telefono !== undefined) payload.telefono = body.telefono ?? '';
  if (body.rol_conagua !== undefined) payload.rol_conagua = body.rol_conagua ?? '';
  const row = await apiFetch<Record<string, unknown>>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapAdminUser(row);
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>(`/users/${id}`, { method: 'DELETE' });
}

export interface CreateAlertaConfigInput {
  nombre: string;
  descripcion?: string;
  activa?: boolean;
  tipo: AlertaConfigTipo;
  severidad?: Severidad;
  programa_filtro?: string | null;
  municipio_id?: string | null;
  obra_id?: string | null;
  umbral_dias?: number;
  umbral_porcentaje?: number;
  umbral_monto?: number;
  destinatarios?: { user_id: string; nombre: string; telefono: string }[];
}

export type UpdateAlertaConfigInput = Partial<CreateAlertaConfigInput>;

export async function fetchAlertaConfigs(): Promise<AlertaConfig[]> {
  const rows = await apiFetch<Record<string, unknown>[]>('/alerta-configs');
  return rows.map(mapAlertaConfig);
}

export async function createAlertaConfig(body: CreateAlertaConfigInput): Promise<AlertaConfig> {
  const row = await apiFetch<Record<string, unknown>>('/alerta-configs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapAlertaConfig(row);
}

export async function updateAlertaConfig(
  id: string,
  body: UpdateAlertaConfigInput,
): Promise<AlertaConfig> {
  const row = await apiFetch<Record<string, unknown>>(`/alerta-configs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return mapAlertaConfig(row);
}

export async function toggleAlertaConfig(id: string): Promise<AlertaConfig> {
  const row = await apiFetch<Record<string, unknown>>(`/alerta-configs/${id}/toggle`, {
    method: 'PATCH',
  });
  return mapAlertaConfig(row);
}

export async function deleteAlertaConfig(id: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>(`/alerta-configs/${id}`, { method: 'DELETE' });
}

export interface SimularAlertaConfigResult {
  simulado: boolean;
  destinatarios: { nombre: string; telefono: string; mensaje: string }[];
  alertasGeneradas: number;
  obrasCoincidentes?: { id: string; folio: string; nombre: string }[];
}

export async function simularAlertaConfig(id: string): Promise<SimularAlertaConfigResult> {
  const row = await apiFetch<Record<string, unknown>>(`/alerta-configs/${id}/simular`, {
    method: 'POST',
  });
  const dest = Array.isArray(row.destinatarios)
    ? (row.destinatarios as Record<string, unknown>[]).map((d) => ({
        nombre: String(d.nombre ?? ''),
        telefono: String(d.telefono ?? ''),
        mensaje: String(d.mensaje ?? ''),
      }))
    : [];
  const obras = Array.isArray(row.obras_coincidentes)
    ? (row.obras_coincidentes as Record<string, unknown>[]).map((o) => ({
        id: String(o.id),
        folio: String(o.folio ?? ''),
        nombre: String(o.nombre ?? ''),
      }))
    : undefined;
  return {
    simulado: row.simulado === true,
    destinatarios: dest,
    alertasGeneradas: Number(row.alertas_generadas ?? 0),
    obrasCoincidentes: obras,
  };
}

export async function fetchMunicipios(): Promise<MunicipioData[]> {
  const rows = await apiFetch<Record<string, unknown>[]>('/municipios');
  const colors = getMunicipioChartColors();
  return rows.map((row, i) => mapMunicipio(row, colors[i % colors.length]));
}

export async function fetchMunicipio(id: string): Promise<MunicipioData> {
  const row = await apiFetch<Record<string, unknown>>(`/municipios/${id}`);
  return mapMunicipio(row);
}

export async function fetchContratistas(): Promise<Contratista[]> {
  const rows = await apiFetch<Record<string, unknown>[]>('/contratistas');
  return rows.map(mapContratista);
}

export async function fetchContratista(id: string): Promise<Contratista> {
  const row = await apiFetch<Record<string, unknown>>(`/contratistas/${id}`);
  return mapContratista(row);
}

export async function fetchAlertas(params?: { atendida?: boolean; severidad?: string }): Promise<Alerta[]> {
  const qs = new URLSearchParams();
  if (params?.atendida !== undefined) qs.set('atendida', String(params.atendida));
  if (params?.severidad) qs.set('severidad', params.severidad);
  const query = qs.toString() ? `?${qs}` : '';
  const rows = await apiFetch<Record<string, unknown>[]>(`/alertas${query}`);
  return rows.map(mapAlerta);
}

export async function fetchAvancesByObra(obraId: string) {
  const rows = await apiFetch<Record<string, unknown>[]>(`/avances/obra/${obraId}`);
  return rows.map((r) => mapAvance(r, obraId));
}

export async function fetchEstimacionesByObra(obraId: string) {
  const rows = await apiFetch<Record<string, unknown>[]>(`/estimaciones/obra/${obraId}`);
  return rows.map((r) => mapEstimacion(r, obraId));
}

export async function fetchDocumentosByObra(obraId: string): Promise<Documento[]> {
  const rows = await apiFetch<Record<string, unknown>[]>(`/documentos/obra/${obraId}`);
  return rows.map((r) => mapDocumento(r, obraId));
}

export async function fetchObservacionesByObra(obraId: string) {
  const rows = await apiFetch<Record<string, unknown>[]>(`/observaciones/obra/${obraId}`);
  return rows.map((r) => mapObservacion(r, obraId));
}

export async function askChat(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[] = [],
): Promise<{ response: string; suggestions: string[] }> {
  return apiFetch('/chat/ask', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}

export interface CreateAvanceInput {
  periodo: string;
  programado: number;
  reportado: number;
  actividades?: string;
  comentarios?: string;
}

export async function createAvance(obraId: string, body: CreateAvanceInput) {
  const row = await apiFetch<Record<string, unknown>>(`/avances/obra/${obraId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapAvance(row, obraId);
}

export async function validateAvance(
  id: string,
  body: { validado: number; comentarios?: string },
) {
  const row = await apiFetch<Record<string, unknown>>(`/avances/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return mapAvance(row, '');
}

export interface CreateEstimacionInput {
  numero: number;
  periodo: string;
  monto_estimado: number;
  monto_acumulado: number;
  porcentaje_financiero: number;
  fecha_presentacion?: string;
}

export async function createEstimacion(obraId: string, body: CreateEstimacionInput) {
  const row = await apiFetch<Record<string, unknown>>(`/estimaciones/obra/${obraId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapEstimacion(row, obraId);
}

export async function validateEstimacion(
  id: string,
  nivel: 'municipal' | 'estatal',
  aprobar: boolean,
) {
  const qs = new URLSearchParams({
    nivel,
    aprobar: String(aprobar),
  });
  const row = await apiFetch<Record<string, unknown>>(
    `/estimaciones/${id}/validate?${qs}`,
    { method: 'PATCH' },
  );
  return mapEstimacion(row, '');
}

export async function uploadDocumento(obraId: string, formData: FormData) {
  const row = await apiFetchFormData<Record<string, unknown>>(
    `/documentos/obra/${obraId}`,
    formData,
  );
  return mapDocumento(row, obraId);
}

export async function updateDocumentoEstatus(id: string, estatus: string) {
  return apiFetch<Record<string, unknown>>(`/documentos/${id}?estatus=${estatus}`, {
    method: 'PATCH',
  });
}

export async function downloadDocumentoFile(id: string, filename?: string) {
  const token = getToken();
  const res = await fetch(documentoFileUrl(id), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('No se pudo descargar el archivo');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? 'documento';
  a.click();
  URL.revokeObjectURL(url);
}

export interface CreateObservacionInput {
  fecha: string;
  tipo: string;
  descripcion: string;
  severidad?: string;
  responsable?: string;
  fecha_compromiso?: string;
}

export async function createObservacion(obraId: string, body: CreateObservacionInput) {
  const row = await apiFetch<Record<string, unknown>>(`/observaciones/obra/${obraId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapObservacion(row, obraId);
}

export async function updateObservacionEstatus(id: string, estatus: string) {
  return apiFetch<Record<string, unknown>>(`/observaciones/${id}?estatus=${estatus}`, {
    method: 'PATCH',
  });
}

export async function atenderAlerta(id: string, accionTomada: string) {
  const qs = new URLSearchParams({ accion_tomada: accionTomada });
  return apiFetch<Record<string, unknown>>(`/alertas/${id}/atender?${qs}`, {
    method: 'PATCH',
  });
}

export interface ChartPoint {
  estatus?: string;
  programa?: string;
  municipio?: string;
  count?: number;
  obras_count?: number;
  programas_count?: number;
  inversion_total?: number;
  monto?: number;
  mes?: string;
  programado?: number;
  real?: number;
}

export async function fetchChartObrasPorEstatus() {
  return apiFetch<ChartPoint[]>('/dashboard/chart/obras-por-estatus');
}

export async function fetchChartObrasPorPrograma() {
  return apiFetch<ChartPoint[]>('/dashboard/chart/obras-por-programa');
}

export async function fetchChartTopMunicipios() {
  return apiFetch<ChartPoint[]>('/dashboard/chart/top-municipios');
}

export async function fetchChartTopContratistas(programaId?: string): Promise<TopContratistaChartRow[]> {
  const qs = programaId ? `?programa=${encodeURIComponent(programaId)}` : '';
  try {
    const rows = await apiFetch<Record<string, unknown>[]>(
      `/dashboard/chart/top-contratistas${qs}`,
    );
    return rows.map(mapTopContratista);
  } catch {
    const obras = await fetchObras();
    const filtered = programaId
      ? obras.filter((o) => o.programa === programaId)
      : obras;
    const byContratista = new Map<string, { obras: Obra[]; nombre: string }>();
    for (const obra of filtered) {
      if (!obra.contratistaId) continue;
      const bucket = byContratista.get(obra.contratistaId) ?? {
        obras: [],
        nombre: obra.contratista || obra.contratistaId,
      };
      bucket.obras.push(obra);
      byContratista.set(obra.contratistaId, bucket);
    }
    return [...byContratista.entries()]
      .map(([contratistaId, { obras: list, nombre }]) => ({
        contratista: nombre,
        contratistaId,
        programa: programaId,
        obrasCount: list.length,
        avancePromedio:
          list.length > 0
            ? list.reduce((s, o) => s + o.avanceFisicoReal, 0) / list.length
            : 0,
        montoTotal: list.reduce((s, o) => s + o.montoAutorizado, 0),
      }))
      .sort((a, b) => b.obrasCount - a.obrasCount)
      .slice(0, 10);
  }
}

export async function downloadObrasExport(format: 'csv' = 'csv'): Promise<void> {
  const { blob, filename } = await apiFetchBlob(`/obras/export?format=${format}`);
  triggerBlobDownload(blob, filename ?? `obras.${format}`);
}

export async function downloadDashboardSummaryExport(): Promise<void> {
  const { blob, filename } = await apiFetchBlob('/dashboard/export/summary?format=csv');
  const defaultName = blob.type.includes('pdf') ? 'resumen-dashboard.pdf' : 'resumen-dashboard.csv';
  triggerBlobDownload(blob, filename ?? defaultName);
}

export async function fetchChartAvanceTimeline() {
  return apiFetch<ChartPoint[]>('/dashboard/chart/avance-timeline');
}

/** @deprecated Use fetchChartAvanceTimeline */
export const fetchAvanceTimeline = fetchChartAvanceTimeline;

export interface DashboardKpis {
  total_obras: number;
  obras_en_ejecucion: number;
  obras_retraso: number;
  obras_concluidas: number;
  monto_autorizado: number;
  monto_ejercido: number;
  avance_fisico_promedio: number;
  avance_financiero_promedio: number;
  alertas_criticas: number;
  alertas_altas: number;
  alertas_total: number;
}

export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  try {
    const raw = await apiFetch<Record<string, unknown>>('/dashboard/kpis');
    return {
      total_obras: Number(raw.total_obras ?? 0),
      obras_en_ejecucion: Number(raw.obras_en_ejecucion ?? raw.obras_ejecucion ?? 0),
      obras_retraso: Number(raw.obras_retraso ?? 0),
      obras_concluidas: Number(raw.obras_concluidas ?? 0),
      monto_autorizado: Number(raw.monto_autorizado ?? 0),
      monto_ejercido: Number(raw.monto_ejercido ?? 0),
      avance_fisico_promedio: Number(raw.avance_fisico_promedio ?? 0),
      avance_financiero_promedio: Number(raw.avance_financiero_promedio ?? 0),
      alertas_criticas: Number(raw.alertas_criticas ?? 0),
      alertas_altas: Number(raw.alertas_altas ?? 0),
      alertas_total: Number(raw.alertas_total ?? 0),
    };
  } catch {
    const obras = await fetchObras();
    const alertas = await fetchAlertas().catch(() => [] as Alerta[]);
    const total = obras.length || 1;
    return {
      total_obras: obras.length,
      obras_en_ejecucion: obras.filter((o) => o.estatus === 'en_ejecucion_a_tiempo').length,
      obras_retraso: obras.filter((o) => o.estatus === 'en_ejecucion_retraso').length,
      obras_concluidas: obras.filter((o) => o.estatus === 'concluida').length,
      monto_autorizado: obras.reduce((s, o) => s + o.montoAutorizado, 0),
      monto_ejercido: obras.reduce((s, o) => s + o.montoEjercido, 0),
      avance_fisico_promedio: obras.reduce((s, o) => s + o.avanceFisicoReal, 0) / total,
      avance_financiero_promedio: obras.reduce((s, o) => s + o.avanceFinanciero, 0) / total,
      alertas_criticas: alertas.filter((a) => a.severidad === 'critica' && !a.atendida).length,
      alertas_altas: alertas.filter((a) => a.severidad === 'alta' && !a.atendida).length,
      alertas_total: alertas.filter((a) => !a.atendida).length,
    };
  }
}

// --- PROAGUA / CONAGUA ---

export async function fetchCofinanciamientosByObra(obraId: string): Promise<Cofinanciamiento[]> {
  const rows = await apiFetch<Record<string, unknown>[]>(`/obras/${obraId}/cofinanciamientos`);
  return rows.map((r) => mapCofinanciamiento(r, obraId));
}

export async function createCofinanciamiento(
  obraId: string,
  body: { fuente: string; monto: number; porcentaje?: number; descripcion?: string },
): Promise<Cofinanciamiento> {
  const row = await apiFetch<Record<string, unknown>>(`/obras/${obraId}/cofinanciamientos`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapCofinanciamiento(row, obraId);
}

export async function updateCofinanciamiento(
  id: string,
  obraId: string,
  body: { fuente?: string; monto?: number; porcentaje?: number; descripcion?: string },
): Promise<Cofinanciamiento> {
  const row = await apiFetch<Record<string, unknown>>(`/cofinanciamientos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return mapCofinanciamiento(row, obraId);
}

export async function deleteCofinanciamiento(id: string): Promise<void> {
  await apiFetch<void>(`/cofinanciamientos/${id}`, { method: 'DELETE' });
}

export async function fetchAvancesTrimestralesByObra(obraId: string): Promise<AvanceTrimestral[]> {
  const rows = await apiFetch<Record<string, unknown>[]>(`/obras/${obraId}/avances-trimestrales`);
  return rows.map((r) => mapAvanceTrimestral(r, obraId));
}

export async function fetchOrganismosOperadores(params?: {
  municipio_id?: string;
  entidad_id?: string;
  search?: string;
}): Promise<OrganismoOperador[]> {
  const qs = new URLSearchParams();
  if (params?.municipio_id) qs.set('municipio_id', params.municipio_id);
  if (params?.entidad_id) qs.set('entidad_id', params.entidad_id);
  if (params?.search) qs.set('search', params.search);
  const query = qs.toString() ? `?${qs}` : '';
  const rows = await apiFetch<Record<string, unknown>[]>(`/organismos-operadores${query}`);
  return rows.map(mapOrganismoOperador);
}

export async function fetchAccionesPrograma(programa?: string): Promise<AccionPrograma[]> {
  const qs = programa ? `?programa=${encodeURIComponent(programa)}` : '';
  const rows = await apiFetch<Record<string, unknown>[]>(`/acciones-programa${qs}`);
  return rows.map(mapAccionPrograma);
}

export async function fetchEntidadesFederativas(): Promise<EntidadFederativa[]> {
  const rows = await apiFetch<Record<string, unknown>[]>('/entidades-federativas');
  return rows.map(mapEntidadFederativa);
}

export async function fetchSolicitudes(params?: { estatus?: string }): Promise<SolicitudPrograma[]> {
  const qs = params?.estatus ? `?estatus=${encodeURIComponent(params.estatus)}` : '';
  const rows = await apiFetch<Record<string, unknown>[]>(`/solicitudes-programa${qs}`);
  return rows.map(mapSolicitudPrograma);
}

export interface CreateSolicitudInput {
  programa: string;
  ejercicio_fiscal: number;
  entidad_id: string;
  municipio_id: string;
  tipo_apoyo: string;
  componente: string;
  monto_solicitado: number;
  estatus?: string;
}

export async function createSolicitud(body: CreateSolicitudInput): Promise<SolicitudPrograma> {
  const row = await apiFetch<Record<string, unknown>>('/solicitudes-programa', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapSolicitudPrograma(row);
}

export async function presentarSolicitud(id: string): Promise<SolicitudPrograma> {
  const row = await apiFetch<Record<string, unknown>>(`/solicitudes-programa/${id}/transicion`, {
    method: 'POST',
    body: JSON.stringify({ estatus: 'presentada' }),
  });
  return mapSolicitudPrograma(row);
}

export type ProaguaExportKind =
  | 'anexo-ix'
  | 'anexo-xiii'
  | 'anexo-xviii'
  | 'anexo-xxii'
  | 'anexo-xxiii';

export async function downloadProaguaExport(kind: ProaguaExportKind, id: string): Promise<void> {
  const { blob, filename } = await apiFetchBlob(`/proagua/export/${kind}/${id}`);
  triggerBlobDownload(blob, filename ?? `${kind}-${id}.xlsx`);
}

export async function fetchAnexosEjecucion(): Promise<AnexoEjecucion[]> {
  const rows = await apiFetch<Record<string, unknown>[]>('/anexos-ejecucion');
  return rows.map(mapAnexoEjecucion);
}

export async function createAnexoEjecucion(body: {
  numero: string;
  ejercicio_fiscal: number;
  entidad_federativa: string;
  monto_federal: number;
  monto_estatal: number;
  fecha_firma?: string;
  fecha_vigencia_fin?: string;
  estatus?: string;
}): Promise<AnexoEjecucion> {
  const row = await apiFetch<Record<string, unknown>>('/anexos-ejecucion', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapAnexoEjecucion(row);
}

export async function fetchAnexosTecnicos(anexoEjecucionId: string): Promise<AnexoTecnico[]> {
  const rows = await apiFetch<Record<string, unknown>[]>(
    `/anexos-ejecucion/${anexoEjecucionId}/tecnicos`,
  );
  return rows.map(mapAnexoTecnico);
}

export async function createAnexoTecnico(
  anexoEjecucionId: string,
  body: {
    organismo_operador_id?: string;
    ejercicio_fiscal: number;
    tipo_localidad: string;
    estatus?: string;
  },
): Promise<AnexoTecnico> {
  const row = await apiFetch<Record<string, unknown>>(
    `/anexos-ejecucion/${anexoEjecucionId}/tecnicos`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return mapAnexoTecnico(row);
}

export async function fetchCierresEjercicio(): Promise<CierreEjercicio[]> {
  const rows = await apiFetch<Record<string, unknown>[]>('/cierres-ejercicio');
  return rows.map(mapCierreEjercicio);
}

export async function createCierreEjercicio(body: {
  anexo_ejecucion_id: string;
  ejercicio_fiscal: number;
  tipo_apoyo: string;
  monto_transferido: number;
  monto_reintegrado_ejercicio?: number;
  monto_modificado_31dic?: number;
  monto_informe_final?: number;
  monto_reintegrado_15ene?: number;
  monto_por_reintegrar?: number;
  fecha_cierre?: string;
  estatus?: string;
}): Promise<CierreEjercicio> {
  const row = await apiFetch<Record<string, unknown>>('/cierres-ejercicio', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapCierreEjercicio(row);
}

export async function importProaguaObrasCsv(file: File): Promise<ProaguaImportResult> {
  const fd = new FormData();
  fd.append('file', file);
  return apiFetchFormData<ProaguaImportResult>('/proagua/import/obras/csv', fd);
}

export async function importProaguaObrasJson(
  obras: Record<string, unknown>[],
): Promise<ProaguaImportResult> {
  return apiFetch<ProaguaImportResult>('/proagua/import/obras', {
    method: 'POST',
    body: JSON.stringify({ obras }),
  });
}

export interface CreateAvanceTrimestralInput {
  ejercicio_fiscal: number;
  trimestre: number;
  avance_fisico_trimestre?: number;
  avance_fisico_acumulado?: number;
  avance_fin_trimestre?: number;
  avance_fin_acumulado?: number;
  fecha_entrega?: string;
  observaciones?: string;
}

export async function createAvanceTrimestral(
  obraId: string,
  body: CreateAvanceTrimestralInput,
): Promise<AvanceTrimestral> {
  const row = await apiFetch<Record<string, unknown>>(`/obras/${obraId}/avances-trimestrales`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapAvanceTrimestral(row, obraId);
}

export async function updateAvanceTrimestral(
  obraId: string,
  id: string,
  body: Partial<CreateAvanceTrimestralInput> & { estatus?: string },
): Promise<AvanceTrimestral> {
  const row = await apiFetch<Record<string, unknown>>(
    `/obras/${obraId}/avances-trimestrales/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  return mapAvanceTrimestral(row, obraId);
}

export async function transitionSolicitud(
  id: string,
  estatus: string,
  obraResultanteId?: string,
): Promise<SolicitudPrograma> {
  const body: Record<string, string> = { estatus };
  if (obraResultanteId) body.obra_resultante_id = obraResultanteId;
  const row = await apiFetch<Record<string, unknown>>(`/solicitudes-programa/${id}/transicion`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapSolicitudPrograma(row);
}

export async function deleteSolicitud(id: string): Promise<void> {
  await apiFetch<void>(`/solicitudes-programa/${id}`, { method: 'DELETE' });
}
