export type UserRole = 'estatal' | 'municipal' | 'contratista';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  municipioId?: string;     // para servidor municipal
  contratistaId?: string;   // para contratista
  avatar: string;
}

export type ObraStatus =
  | 'en_ejecucion_a_tiempo' | 'en_ejecucion_retraso' | 'concluida'
  | 'en_riesgo' | 'en_preparacion' | 'en_revision'
  | 'suspendida' | 'en_adjudicacion' | 'en_licitacion'
  | 'cancelada' | 'cerrada';

export type RiesgoNivel = 'bajo' | 'medio' | 'alto' | 'critico';

export type EstimacionStatus =
  | 'no_presentada' | 'presentada' | 'en_revision_municipal'
  | 'observada_municipio' | 'validada_municipio' | 'en_revision_estatal'
  | 'observada_estado' | 'autorizada' | 'pagada' | 'rechazada';

export type DocCategoria = 'administrativa' | 'tecnica' | 'ejecucion' | 'cierre' | 'programa';

export type DocStatus = 'no_cargado' | 'cargado' | 'en_revision' | 'observado' | 'validado';

export type ObservacionType = 'tecnica' | 'administrativa' | 'financiera' | 'documental' | 'programa';

export type Severidad = 'baja' | 'media' | 'alta' | 'critica';

export type ObservacionStatus = 'abierta' | 'en_atencion' | 'atendida' | 'cerrada';

/** Valores conocidos; la BD puede usar otros (p. ej. retraso_fisico, documentacion_incompleta). */
export type AlertaType = string;

export interface ObraProaguaFields {
  cua?: string | null;
  idSisba?: string | null;
  numContrato?: string | null;
  comprasMxFolio?: string | null;
  subcomponente?: string | null;
  tipoLocalidad?: string | null;
  coberturaApAntes?: number | null;
  coberturaApMeta?: number | null;
  coberturaTarAntes?: number | null;
  coberturaTarMeta?: number | null;
  caudalLps?: number | null;
  pobIncorporar?: number | null;
  pobMejorar?: number | null;
  pobMujeres?: number | null;
  pobIndigena?: number | null;
  pobAfromexicano?: number | null;
  entidadFederativaId?: string | null;
  entidadFederativaNombre?: string | null;
  organismoOperadorId?: string | null;
  organismoOperadorNombre?: string | null;
  accionProgramaId?: string | null;
  accionProgramaClave?: string | null;
  anexoTecnicoId?: string | null;
}

export interface Obra extends ObraProaguaFields {
  id: string;
  folio: string;
  nombre: string;
  municipio: string;
  municipioId?: string;
  localidad: string;
  programa: string;
  tipoPrograma: 'federal' | 'estatal';
  dependencia: string;
  tipoObra: string;
  descripcion: string;
  poblacionBeneficiada: number;
  montoAutorizado: number;
  montoContratado: number;
  montoEjercido: number;
  contratista: string;
  contratistaId: string;
  supervisor: string;
  fechaInicio: string;
  fechaTerminoProgramada: string;
  fechaTerminoReal: string | null;
  plazoEjecucion: number;
  avanceFisicoProgramado: number;
  avanceFisicoReal: number;
  avanceFinanciero: number;
  estatus: ObraStatus;
  riesgo: RiesgoNivel;
  latitud: number;
  longitud: number;
  evidenciaFotografica: string[];
}

export type CofinanciamientoFuente = 'federal' | 'estatal' | 'municipal' | 'organismo_operador';

export interface Cofinanciamiento {
  id: string;
  obraId: string;
  fuente: CofinanciamientoFuente | string;
  monto: number;
  porcentaje: number;
  descripcion?: string | null;
}

export interface AvanceTrimestral {
  id: string;
  obraId: string;
  ejercicioFiscal: number;
  trimestre: number;
  avanceFisicoAnterior: number;
  avanceFisicoTrimestre: number;
  avanceFisicoAcumulado: number;
  avanceFinAnterior: number;
  avanceFinTrimestre: number;
  avanceFinAcumulado: number;
  fechaEntrega?: string | null;
  estatus: AvanceMensual['estatus'];
  observaciones?: string;
}

export interface OrganismoOperador {
  id: string;
  nombre: string;
  siglas?: string | null;
  tipoOrganismo: string;
  entidadId?: string | null;
  municipioId?: string | null;
  rfc?: string | null;
  director?: string | null;
}

export interface AccionPrograma {
  id: string;
  programa: string;
  componente: string;
  subcomponente: string;
  clave: string;
  descripcion: string;
  unidad: string;
  tipoLocalidad: string;
}

export type SolicitudEstatus = 'borrador' | 'presentada' | 'aprobada' | 'rechazada' | 'observada';

export interface SolicitudPrograma {
  id: string;
  programa: string;
  ejercicioFiscal: number;
  entidadId: string;
  entidadNombre?: string;
  municipioId: string;
  municipioNombre?: string;
  tipoApoyo: string;
  componente: string;
  montoSolicitado: number;
  estatus: SolicitudEstatus | string;
  obraResultanteId?: string | null;
  obraResultanteFolio?: string | null;
  createdAt?: string;
}

export interface EntidadFederativa {
  id: string;
  nombre: string;
  clave: string;
}

export interface AvanceMensual {
  id: string;
  obraId: string;
  periodo: string;
  programado: number;
  reportado: number;
  validado: number | null;
  variacion: number;
  estatus: 'pendiente' | 'en_revision' | 'validado' | 'observado';
}

export interface Estimacion {
  id: string;
  obraId: string;
  numero: number;
  periodo: string;
  montoEstimado: number;
  montoAcumulado: number;
  porcentajeFinanciero: number;
  estatus: EstimacionStatus;
  fechaPresentacion: string;
  fechaRevision: string | null;
  fechaAutorizacion: string | null;
  validacionMunicipal: boolean;
  validacionEstatal: boolean;
}

export interface Documento {
  id: string;
  obraId: string;
  categoria: DocCategoria;
  nombre: string;
  tipo: 'pdf' | 'imagen' | 'excel' | 'word';
  estatus: DocStatus;
  fechaCarga: string | null;
  responsable: string;
  archivo?: string | null;
}

export interface Observacion {
  id: string;
  obraId: string;
  usuarioEmisor: string;
  fecha: string;
  tipo: ObservacionType;
  descripcion: string;
  severidad: Severidad;
  responsable: string;
  fechaCompromiso: string | null;
  estatus: ObservacionStatus;
  respuestas: RespuestaObservacion[];
}

export interface RespuestaObservacion {
  id: string;
  usuario: string;
  fecha: string;
  descripcion: string;
}

export interface Alerta {
  id: string;
  obraId: string;
  municipio: string;
  titulo: string;
  descripcion: string;
  tipo: AlertaType;
  severidad: Severidad;
  fechaGeneracion: string;
  atendida: boolean;
  accionTomada?: string | null;
}

export type AlertaConfigTipo =
  | 'sin_actualizaciones'
  | 'exceso_presupuesto'
  | 'retraso_fisico'
  | 'sin_estimaciones'
  | 'documentacion_incompleta';

export interface AlertaConfigDestinatario {
  userId: string;
  nombre: string;
  telefono: string;
}

export interface AlertaConfig {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activa: boolean;
  tipo: AlertaConfigTipo;
  severidad: Severidad;
  programaFiltro?: string | null;
  municipioId?: string | null;
  municipioNombre?: string | null;
  obraId?: string | null;
  obraNombre?: string | null;
  obraFolio?: string | null;
  umbralDias?: number | null;
  umbralPorcentaje?: number | null;
  umbralMonto?: number | null;
  destinatarios: AlertaConfigDestinatario[];
  creadoPor: string;
  creadorNombre?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarInitials: string;
  municipioId?: string;
  contratistaId?: string;
  isActive: boolean;
  telefono?: string | null;
}

export interface Contratista {
  id: string;
  nombre: string;
  rfc: string;
  representante: string;
  obrasAsignadas: number;
  montoTotal: number;
  avancePromedio: number;
  observacionesPendientes: number;
}

export interface MunicipioData {
  id: string;
  nombre: string;
  obras: number;
  inversionTotal: number;
  avanceFisicoPromedio: number;
  avanceFinancieroPromedio: number;
  obrasRetrasadas: number;
  obrasConcluidas: number;
  programasActivos: number;
  latitud: number;
  longitud: number;
  color: string;
}

export interface Programa {
  id: string;
  nombre: string;
  nombreCorto: string;
  tipo: 'federal' | 'estatal';
  montoTotal: number;
  obrasCount: number;
  color: string;
}

/** Row from GET /dashboard/chart/top-contratistas */
export interface TopContratistaChartRow {
  contratista: string;
  contratistaId?: string;
  programa?: string;
  obrasCount: number;
  avancePromedio?: number;
  montoTotal?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
