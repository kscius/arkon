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

export type AlertaType = 'retraso' | 'documental' | 'financiera' | 'tecnica' | 'programa';

export interface Obra {
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
