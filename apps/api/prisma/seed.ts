import {
  CategoriaDocumento,
  EstatusAvance,
  EstatusEstimacion,
  EstatusObra,
  EstadoDocumento,
  EstatusObservacion,
  PrismaClient,
  Rol,
  TipoObra,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

function resolveSeedDir(): string {
  const tenant = process.env.TENANT_ID?.trim().toLowerCase();
  const conaguaDir = join(__dirname, 'seed-data', 'conagua');
  if (tenant === 'conagua' && existsSync(conaguaDir)) {
    return conaguaDir;
  }
  return join(__dirname, 'seed-data');
}

const seedDir = resolveSeedDir();

function demoTenant() {
  const tenant = process.env.TENANT_ID?.trim().toLowerCase();
  if (tenant === 'conagua') {
    return { domain: 'conagua.gob.mx', password: 'Conagua2024!', label: 'CONAGUA' };
  }
  return { domain: 'arkon.gob.mx', password: 'Arkon2024!', label: 'ARKON' };
}

function demoEmail(localPart: string): string {
  return `${localPart}@${demoTenant().domain}`;
}

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(seedDir, name), 'utf-8')) as T;
}

function isConaguaTenant(): boolean {
  return process.env.TENANT_ID?.trim().toLowerCase() === 'conagua';
}

function resolveContratistaId(
  contratistas: { id: string; nombre: string }[],
  contratistaNombre: string | undefined,
  fallbackIndex: number,
): string {
  if (contratistaNombre) {
    const key = contratistaNombre.toLowerCase();
    const match = contratistas.find(
      (c) =>
        c.nombre.toLowerCase().includes(key) ||
        c.nombre.toLowerCase().includes(`(${key})`),
    );
    if (match) return match.id;
  }
  return contratistas[fallbackIndex % contratistas.length].id;
}

function resolveOrganismoOperadorId(
  organismos: { id: string; siglas: string | null; nombre: string }[],
  siglasOrNombre: string | undefined,
): string | null {
  if (!siglasOrNombre) return null;
  const key = siglasOrNombre.toLowerCase();
  const match = organismos.find(
    (o) =>
      o.siglas?.toLowerCase() === key ||
      o.siglas?.toLowerCase().includes(key) ||
      o.nombre.toLowerCase().includes(key) ||
      o.nombre.toLowerCase().includes(`(${key})`),
  );
  return match?.id ?? null;
}

function generateCua(folio: string, cuaFromSeed?: string): string {
  return cuaFromSeed ?? `CUA-${folio}`;
}

const MUNICIPIO_ENTIDAD_CLAVE: Record<string, string> = {
  'Guadalupe Victoria': '10',
  'Santiago Papasquiaro': '10',
  León: '11',
  Irapuato: '11',
  Celaya: '11',
  Cortázar: '11',
  Guanajuato: '11',
  Puebla: '21',
  Mérida: '31',
  'San Juan del Río': '22',
  Tulum: '23',
  Tepache: '26',
  Cuernavaca: '17',
  CDMX: '09',
};

const EXECUTION_ESTATUS = new Set<string>([
  'en_ejecucion_a_tiempo',
  'en_ejecucion_retraso',
  'en_riesgo',
]);

type EntidadSeed = { nombre: string; clave: string };
type OrganismoSeed = {
  nombre: string;
  siglas: string;
  tipo_organismo: string;
  entidad_clave: string;
  rfc?: string;
  director?: string;
  email?: string;
  telefono?: string;
};
type AccionProgramaSeed = {
  programa: string;
  componente: string;
  subcomponente: string;
  clave: string;
  descripcion: string;
  unidad: string;
  tipo_localidad: string;
};

type MunicipioSeed = { nombre: string; latitud: number; longitud: number };
type ContratistaSeed = {
  nombre: string;
  rfc: string;
  representante: string;
  email?: string;
  telefono?: string;
  registro_padron?: string;
};
type ObraSeed = {
  folio: string;
  nombre: string;
  localidad: string;
  programa: string;
  tipo_programa: string;
  dependencia: string;
  tipo_obra: string;
  descripcion: string;
  poblacion_beneficiada: number;
  monto_autorizado: number;
  monto_contratado: number;
  monto_ejercido: number;
  supervisor: string;
  fecha_inicio: string;
  fecha_termino_programada: string;
  plazo_ejecucion: number;
  avance_fisico_programado: number;
  avance_fisico_real: number;
  avance_financiero: number;
  estatus: string;
  riesgo: string;
  latitud: number;
  longitud: number;
  contratista_nombre?: string;
  cua?: string;
  subcomponente?: string;
  tipo_localidad?: string;
  accion_programa_clave?: string;
};
type AlertaSeed = {
  obra_id: string | null;
  municipio: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  severidad: string;
  fecha_generacion: string;
  atendida: boolean;
  accion_tomada?: string;
};

const DOC_CATEGORIAS: CategoriaDocumento[] = [
  CategoriaDocumento.administrativa,
  CategoriaDocumento.tecnica,
  CategoriaDocumento.ejecucion,
  CategoriaDocumento.cierre,
  CategoriaDocumento.programa,
  CategoriaDocumento.administrativa,
  CategoriaDocumento.tecnica,
  CategoriaDocumento.ejecucion,
];

const DOC_ESTATUS: EstadoDocumento[] = [
  EstadoDocumento.cargado,
  EstadoDocumento.cargado,
  EstadoDocumento.cargado,
  EstadoDocumento.en_revision,
  EstadoDocumento.no_cargado,
];

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
];

type ProgramaCanonico = {
  id: string;
  nombreCorto: string;
  nombre: string;
  tipo: string;
  dependencia: string;
};

/** Canonical programas for ARKON demo (obra.programa in seed-data/obras.json) */
const PROGRAMAS_CANONICOS_ARKON: readonly ProgramaCanonico[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    nombreCorto: 'FAPAA',
    nombre: 'Fondo de Aportaciones para el Fortalecimiento de las Entidades Federativas',
    tipo: 'federal',
    dependencia: 'SHCP',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    nombreCorto: 'CAM',
    nombre: 'Convenio de Coordinación para el Desarrollo Social',
    tipo: 'federal',
    dependencia: 'SEDESOL',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    nombreCorto: 'FAIS',
    nombre: 'Fondo de Aportaciones para la Infraestructura Social',
    tipo: 'federal',
    dependencia: 'SEDATU',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    nombreCorto: 'FORTAMUN',
    nombre: 'Fondo de Aportaciones para el Fortalecimiento de los Municipios',
    tipo: 'federal',
    dependencia: 'SHCP',
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    nombreCorto: 'FOMAGUA',
    nombre: 'Fondo de Agua Potable y Alcantarillado',
    tipo: 'estatal',
    dependencia: 'CONAGUA',
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    nombreCorto: 'FOISE',
    nombre: 'Fondo de Infraestructura Social Estatal',
    tipo: 'estatal',
    dependencia: 'Gobierno del Estado',
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    nombreCorto: 'PEF',
    nombre: 'Programa Estatal de Fortalecimiento',
    tipo: 'estatal',
    dependencia: 'Gobierno del Estado',
  },
  {
    id: '10000000-0000-4000-8000-000000000008',
    nombreCorto: 'SISPLADE',
    nombre: 'Sistema de Planeación Democrática',
    tipo: 'estatal',
    dependencia: 'Gobierno del Estado',
  },
] as const;

const PROGRAMAS_CANONICOS_CONAGUA: readonly ProgramaCanonico[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    nombreCorto: 'PROAGUA',
    nombre:
      'Programa de Agua Potable, Drenaje y Tratamiento de Aguas Residuales (PROAGUA)',
    tipo: 'federal',
    dependencia: 'CONAGUA',
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    nombreCorto: 'PEAS',
    nombre: 'Programa de Agua y Saneamiento para el Bienestar (PEAS)',
    tipo: 'federal',
    dependencia: 'CONAGUA',
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    nombreCorto: 'PRODDER',
    nombre:
      'Programa de Devolución de Derechos y Aprovechamientos (PRODDER)',
    tipo: 'federal',
    dependencia: 'CONAGUA',
  },
] as const;

function programasCanonicosForTenant(tenantId?: string): readonly ProgramaCanonico[] {
  const tenant = tenantId?.trim().toLowerCase() ?? process.env.TENANT_ID?.trim().toLowerCase();
  if (tenant === 'conagua') {
    return PROGRAMAS_CANONICOS_CONAGUA;
  }
  return PROGRAMAS_CANONICOS_ARKON;
}

function componenteFromObra(tipoObra: string, nombre: string): string {
  if (tipoObra === 'agua_potable') return 'AP';
  const lower = nombre.toLowerCase();
  if (lower.includes('ptar') || lower.includes('saneamiento') || lower.includes('lodos')) {
    return 'saneamiento';
  }
  return 'alcantarillado';
}

const PROAGUA_ALERTA_CONFIGS = [
  {
    nombre: 'Plazo de contratacion PROAGUA',
    descripcion: 'Obra PROAGUA sin contrato al 31 de agosto (Art. 5 U074)',
    tipo: 'plazo_contratacion',
    severidad: 'alta',
    programaFiltro: 'PROAGUA',
    umbralDias: 1,
  },
  {
    nombre: 'Plazo de conclusion PROAGUA',
    descripcion: 'Obra activa despues del 31 de diciembre (Art. 5 U074)',
    tipo: 'plazo_conclusion',
    severidad: 'critica',
    programaFiltro: 'PROAGUA',
    umbralDias: 1,
  },
  {
    nombre: 'Informe trimestral pendiente',
    descripcion: 'Avance trimestral no presentado en 5 dias habiles post-cierre',
    tipo: 'informe_trimestral_pendiente',
    severidad: 'alta',
    programaFiltro: 'PROAGUA',
    umbralDias: 5,
  },
  {
    nombre: 'Sancion por anexos tardios',
    descripcion: 'Anexo tecnico sin firma en 10 dias habiles post-aprobacion (-15% presupuesto)',
    tipo: 'sancion_anexos_tardios',
    severidad: 'critica',
    programaFiltro: 'PROAGUA',
    umbralDias: 10,
  },
  {
    nombre: 'Reintegro pendiente TESOFE',
    descripcion: 'Recursos no reintegrados 15 dias naturales post-cierre de ejercicio',
    tipo: 'reintegro_pendiente',
    severidad: 'critica',
    programaFiltro: 'PROAGUA',
    umbralDias: 15,
  },
  {
    nombre: 'Dispersion retrasada a ejecutor',
    descripcion: 'Sin transferencia registrada en 10 dias habiles post-formalizacion de anexos',
    tipo: 'dispersion_retrasada',
    severidad: 'media',
    programaFiltro: 'PROAGUA',
    umbralDias: 10,
  },
] as const;

async function main() {
  const tenant = demoTenant();
  const programasCanonicos = programasCanonicosForTenant();
  console.log(`${tenant.label} Database Seeder`);
  console.log(`  Seed data: ${seedDir}`);
  console.log('='.repeat(60));

  await prisma.$transaction([
    prisma.alerta.deleteMany(),
    prisma.alertaConfig.deleteMany(),
    prisma.observacion.deleteMany(),
    prisma.documento.deleteMany(),
    prisma.estimacion.deleteMany(),
    prisma.avanceMensual.deleteMany(),
    prisma.avanceTrimestral.deleteMany(),
    prisma.cofinanciamiento.deleteMany(),
    prisma.solicitudPrograma.deleteMany(),
    prisma.obra.deleteMany(),
    prisma.cierreEjercicio.deleteMany(),
    prisma.anexoTecnico.deleteMany(),
    prisma.anexoEjecucion.deleteMany(),
    prisma.usuario.deleteMany(),
    prisma.contratista.deleteMany(),
    prisma.accionPrograma.deleteMany(),
    prisma.organismoOperador.deleteMany(),
    prisma.municipio.deleteMany(),
    prisma.entidadFederativa.deleteMany(),
    prisma.programa.deleteMany(),
  ]);

  for (const p of programasCanonicos) {
    await prisma.programa.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        nombre: p.nombre,
        nombreCorto: p.nombreCorto,
        tipo: p.tipo,
        dependencia: p.dependencia,
      },
      update: {
        nombre: p.nombre,
        nombreCorto: p.nombreCorto,
        tipo: p.tipo,
        dependencia: p.dependencia,
      },
    });
  }
  console.log(`  Seeded ${programasCanonicos.length} programas`);

  const conagua = isConaguaTenant();
  let entidades: { id: string; nombre: string; clave: string }[] = [];
  let organismos: { id: string; siglas: string | null; nombre: string; entidadId: string | null }[] =
    [];
  let accionesPrograma: { id: string; clave: string; componente: string; subcomponente: string; tipoLocalidad: string }[] =
    [];

  if (conagua) {
    const entidadesData = loadJson<EntidadSeed[]>('entidades-federativas.json');
    entidades = await Promise.all(
      entidadesData.map((e) =>
        prisma.entidadFederativa.create({
          data: { nombre: e.nombre, clave: e.clave },
        }),
      ),
    );
    console.log(`  Seeded ${entidades.length} entidades federativas`);

    const accionesData = loadJson<AccionProgramaSeed[]>('acciones-programa.json');
    accionesPrograma = await Promise.all(
      accionesData.map((a) =>
        prisma.accionPrograma.create({
          data: {
            programa: a.programa,
            componente: a.componente,
            subcomponente: a.subcomponente,
            clave: a.clave,
            descripcion: a.descripcion,
            unidad: a.unidad,
            tipoLocalidad: a.tipo_localidad,
          },
        }),
      ),
    );
    console.log(`  Seeded ${accionesPrograma.length} acciones programa`);
  }

  const entidadByClave = new Map(entidades.map((e) => [e.clave, e]));

  const municipiosData = loadJson<MunicipioSeed[]>('municipios.json');
  const municipios = await Promise.all(
    municipiosData.map((m) =>
      prisma.municipio.create({
        data: {
          nombre: m.nombre,
          latitud: m.latitud,
          longitud: m.longitud,
          ...(conagua && MUNICIPIO_ENTIDAD_CLAVE[m.nombre]
            ? { entidadId: entidadByClave.get(MUNICIPIO_ENTIDAD_CLAVE[m.nombre])!.id }
            : {}),
        },
      }),
    ),
  );
  console.log(`  Seeded ${municipios.length} municipios`);

  if (conagua) {
    const organismosData = loadJson<OrganismoSeed[]>('organismos-operadores.json');
    organismos = await Promise.all(
      organismosData.map((o) =>
        prisma.organismoOperador.create({
          data: {
            nombre: o.nombre,
            siglas: o.siglas,
            tipoOrganismo: o.tipo_organismo,
            entidadId: entidadByClave.get(o.entidad_clave)?.id,
            rfc: o.rfc,
            director: o.director,
            email: o.email,
            telefono: o.telefono,
          },
        }),
      ),
    );
    console.log(`  Seeded ${organismos.length} organismos operadores`);
  }

  const municipioByName = new Map(municipios.map((m) => [m.nombre, m]));
  const municipioAt = (index: number): string => {
    if (municipios.length === 0) {
      throw new Error('No municipios seeded');
    }
    return municipios[index % municipios.length].id;
  };

  const contratistasData = loadJson<ContratistaSeed[]>('contratistas.json');
  const contratistas = await Promise.all(
    contratistasData.map((c) =>
      prisma.contratista.create({
        data: {
          nombre: c.nombre,
          rfc: c.rfc,
          representante: c.representante,
          email: c.email,
          telefono: c.telefono,
          registroPadron: c.registro_padron,
        },
      }),
    ),
  );
  console.log(`  Seeded ${contratistas.length} contratistas`);

  const passwordHash = await bcrypt.hash(tenant.password, 10);
  const usersData = [
    {
      email: demoEmail('estatal'),
      fullName: 'Lic. Martha Elena Vazquez',
      rol: Rol.estatal,
      avatarInitials: 'MV',
      municipioId: null as string | null,
      contratistaId: null as string | null,
      rolConagua: conagua ? 'director_conagua' : null,
    },
    {
      email: demoEmail('coordinador'),
      fullName: 'Ing. Jorge Luis Martinez',
      rol: Rol.estatal,
      avatarInitials: 'JM',
      municipioId: null,
      contratistaId: null,
      rolConagua: conagua ? 'coordinador_regional' : null,
    },
    {
      email: demoEmail('municipal.centro'),
      fullName: 'Arq. Laura Patricia Mendez',
      rol: Rol.municipal,
      avatarInitials: 'LM',
      municipioId: municipioAt(0),
      contratistaId: null,
      rolConagua: conagua ? 'ejecutor_municipal' : null,
    },
    {
      email: demoEmail('municipal.norte'),
      fullName: 'Ing. Roberto Carlos Diaz',
      rol: Rol.municipal,
      avatarInitials: 'RD',
      municipioId: municipioAt(1),
      contratistaId: null,
      rolConagua: conagua ? 'ejecutor_municipal' : null,
    },
    {
      email: demoEmail('municipal.valle'),
      fullName: 'Lic. Maria Fernanda Ruiz',
      rol: Rol.municipal,
      avatarInitials: 'MR',
      municipioId: municipioAt(2),
      contratistaId: null,
      rolConagua: conagua ? 'corese' : null,
    },
    {
      email: demoEmail('municipal.sur'),
      fullName: 'Ing. Jose Antonio Flores',
      rol: Rol.municipal,
      avatarInitials: 'JF',
      municipioId: municipioAt(3),
      contratistaId: null,
      rolConagua: conagua ? 'ejecutor_municipal' : null,
    },
    {
      email: demoEmail('cce'),
      fullName: 'Ing. Carlos Mendez Rodriguez',
      rol: Rol.contratista,
      avatarInitials: 'CM',
      municipioId: null,
      contratistaId: contratistas[0].id,
      rolConagua: conagua ? 'contratista_oo' : null,
    },
    {
      email: demoEmail('gdp'),
      fullName: 'Arq. Maria Elena Torres',
      rol: Rol.contratista,
      avatarInitials: 'MT',
      municipioId: null,
      contratistaId: contratistas[1].id,
      rolConagua: conagua ? 'contratista_oo' : null,
    },
    {
      email: demoEmail('ies'),
      fullName: 'Ing. Roberto Hernandez Lopez',
      rol: Rol.contratista,
      avatarInitials: 'RH',
      municipioId: null,
      contratistaId: contratistas[2].id,
      rolConagua: conagua ? 'contratista_oo' : null,
    },
  ];

  const users = await Promise.all(
    usersData.map((u) =>
      prisma.usuario.create({
        data: { ...u, passwordHash, isActive: true },
      }),
    ),
  );
  console.log(`  Seeded ${users.length} users`);

  const obrasData = loadJson<ObraSeed[]>('obras.json');
  const accionByClave = new Map(accionesPrograma.map((a) => [a.clave, a]));

  const resolveAccionProgramaId = (o: ObraSeed): string | null => {
    if (!conagua || accionesPrograma.length === 0) return null;
    if (o.accion_programa_clave) {
      return accionByClave.get(o.accion_programa_clave)?.id ?? null;
    }
    const componente = componenteFromObra(o.tipo_obra, o.nombre);
    const subcomponente = o.subcomponente ?? 'nuevo';
    const tipoLocalidad = o.tipo_localidad ?? 'urbana';
    const match = accionesPrograma.find(
      (a) =>
        a.componente === componente &&
        a.subcomponente === subcomponente &&
        a.tipoLocalidad === tipoLocalidad,
    );
    return match?.id ?? accionesPrograma[0]?.id ?? null;
  };

  const obras = await Promise.all(
    obrasData.map((o, i) => {
      const organismoOperadorId = conagua
        ? resolveOrganismoOperadorId(organismos, o.contratista_nombre)
        : null;
      const organismo = organismos.find((org) => org.id === organismoOperadorId);
      const entidadFederativaId = organismo?.entidadId ?? null;

      return prisma.obra.create({
        data: {
          folio: o.folio,
          nombre: o.nombre,
          localidad: o.localidad,
          programa: o.programa,
          tipoPrograma: o.tipo_programa,
          dependencia: o.dependencia,
          tipoObra: o.tipo_obra as TipoObra,
          descripcion: o.descripcion,
          poblacionBeneficiada: o.poblacion_beneficiada,
          montoAutorizado: o.monto_autorizado,
          montoContratado: o.monto_contratado,
          montoEjercido: o.monto_ejercido,
          supervisor: o.supervisor,
          fechaInicio: o.fecha_inicio || null,
          fechaTerminoProgramada: o.fecha_termino_programada || null,
          plazoEjecucion: o.plazo_ejecucion,
          avanceFisicoProgramado: o.avance_fisico_programado,
          avanceFisicoReal: o.avance_fisico_real,
          avanceFinanciero: o.avance_financiero,
          estatus: o.estatus as EstatusObra,
          riesgo: o.riesgo,
          latitud: o.latitud,
          longitud: o.longitud,
          evidenciaFotografica: [],
          municipioId: municipios[i % municipios.length].id,
          contratistaId: resolveContratistaId(contratistas, o.contratista_nombre, i),
          ...(conagua
            ? {
                cua: generateCua(o.folio, o.cua),
                subcomponente: o.subcomponente,
                tipoLocalidad: o.tipo_localidad,
                entidadFederativaId,
                organismoOperadorId,
                accionProgramaId: resolveAccionProgramaId(o),
              }
            : {}),
        },
      });
    }),
  );
  console.log(`  Seeded ${obras.length} obras`);

  if (conagua) {
    let cofinCount = 0;
    for (const obra of obras) {
      const monto = Number(obra.montoAutorizado);
      const mitad = monto / 2;
      await prisma.cofinanciamiento.createMany({
        data: [
          {
            obraId: obra.id,
            fuente: 'federal',
            monto: mitad,
            porcentaje: 50,
            descripcion: 'Aportacion federal PROAGUA/CONAGUA',
          },
          {
            obraId: obra.id,
            fuente: 'estatal',
            monto: mitad,
            porcentaje: 50,
            descripcion: 'Contraparte estatal 50%',
          },
        ],
      });
      cofinCount += 2;
    }
    console.log(`  Seeded ${cofinCount} cofinanciamiento records`);

    let trimestralCount = 0;
    for (const obra of obras) {
      if (!EXECUTION_ESTATUS.has(obra.estatus)) continue;
      const ejercicio = Number(obra.folio.match(/\d{4}/)?.[0] ?? 2024);
      const avanceFin = Number(obra.montoEjercido);
      const avanceFis = Number(obra.avanceFisicoReal);
      const trimestres = [
        {
          trimestre: 1,
          fisAnt: 0,
          fisTri: Math.min(avanceFis * 0.35, 35),
          finAnt: 0,
          finTri: avanceFin * 0.3,
        },
        {
          trimestre: 2,
          fisAnt: Math.min(avanceFis * 0.35, 35),
          fisTri: Math.min(avanceFis * 0.35, 35),
          finAnt: avanceFin * 0.3,
          finTri: avanceFin * 0.35,
        },
      ];
      for (const t of trimestres) {
        const fisAcum = t.fisAnt + t.fisTri;
        const finAcum = t.finAnt + t.finTri;
        await prisma.avanceTrimestral.create({
          data: {
            obraId: obra.id,
            ejercicioFiscal: ejercicio,
            trimestre: t.trimestre,
            avanceFisicoAnterior: t.fisAnt,
            avanceFisicoTrimestre: t.fisTri,
            avanceFisicoAcumulado: fisAcum,
            avanceFinAnterior: t.finAnt,
            avanceFinTrimestre: t.finTri,
            avanceFinAcumulado: finAcum,
            fechaEntrega: t.trimestre === 1 ? `10-04-${ejercicio}` : `10-07-${ejercicio}`,
            estatus: t.trimestre === 1 ? EstatusAvance.validado : EstatusAvance.pendiente,
            observaciones: `Informe trimestral Q${t.trimestre} ${ejercicio}`,
          },
        });
        trimestralCount++;
      }
    }
    console.log(`  Seeded ${trimestralCount} avance trimestral records`);

    const guanajuatoEntidad = entidades.find((e) => e.clave === '11');
    const japamiOrg = organismos.find((o) => o.siglas === 'JAPAMI');
    const simapagOrg = organismos.find((o) => o.siglas === 'SIMAPAG');
    const obrasGto2026 = obras.filter((o) =>
      ['PEAS-2026-001', 'PEAS-2026-005'].includes(o.folio),
    );

    if (guanajuatoEntidad && japamiOrg && simapagOrg) {
      const montoFederal = obrasGto2026.reduce((sum, o) => sum + Number(o.montoAutorizado) / 2, 0);
      const montoEstatal = montoFederal;

      const anexoEjecucion = await prisma.anexoEjecucion.create({
        data: {
          numero: 'AE-GTO-2026-001',
          ejercicioFiscal: 2026,
          entidadFederativa: guanajuatoEntidad.nombre,
          montoFederal,
          montoEstatal,
          fechaFirma: '15-01-2026',
          fechaVigenciaFin: '31-12-2026',
          estatus: 'vigente',
        },
      });

      const anexoJapami = await prisma.anexoTecnico.create({
        data: {
          anexoEjecucionId: anexoEjecucion.id,
          organismoOperadorId: japamiOrg.id,
          ejercicioFiscal: 2026,
          tipoLocalidad: 'urbana',
          estatus: 'vigente',
        },
      });

      const anexoSimapag = await prisma.anexoTecnico.create({
        data: {
          anexoEjecucionId: anexoEjecucion.id,
          organismoOperadorId: simapagOrg.id,
          ejercicioFiscal: 2026,
          tipoLocalidad: 'urbana',
          estatus: 'vigente',
        },
      });

      for (const obra of obrasGto2026) {
        const anexoId =
          obra.folio === 'PEAS-2026-001' ? anexoJapami.id : anexoSimapag.id;
        await prisma.obra.update({
          where: { id: obra.id },
          data: { anexoTecnicoId: anexoId },
        });
      }
      console.log('  Seeded AnexoEjecucion + 2 AnexoTecnico (Guanajuato 2026)');
    }

    let proaguaEnriched = 0;
    for (let i = 0; i < obras.length; i++) {
      const obra = obras[i];
      if (!obra.cua) continue;
      const coberturaBase = 38 + (i % 22);
      await prisma.obra.update({
        where: { id: obra.id },
        data: {
          idSisba: `SISBA-${obra.folio.replace(/-/g, '')}`,
          numContrato:
            obra.programa === 'PROAGUA' || obra.programa === 'PEAS'
              ? `12R100-${obra.folio}-01`
              : null,
          comprasMxFolio: obra.programa === 'PROAGUA' ? `CMX-${obra.folio}` : null,
          tipoAdjudicacion: 'licitacion_publica',
          fechaFallo: obra.fechaInicio,
          coberturaApAntes: coberturaBase,
          coberturaApMeta: Math.min(coberturaBase + 28, 100),
          coberturaTarAntes: Math.max(coberturaBase - 12, 0),
          coberturaTarMeta: Math.min(coberturaBase + 18, 100),
          caudalLps: obra.tipoObra === 'agua_potable' ? 1.8 + (i % 6) * 0.5 : null,
          pobIncorporar: Math.max(1, Math.floor(obra.poblacionBeneficiada * 0.35)),
          pobMejorar: Math.max(1, Math.floor(obra.poblacionBeneficiada * 0.65)),
          pobMujeres: Math.max(1, Math.floor(obra.poblacionBeneficiada * 0.51)),
          pobIndigena: i % 3 === 0 ? Math.floor(obra.poblacionBeneficiada * 0.08) : 0,
          pobAfromexicano: i % 4 === 0 ? Math.floor(obra.poblacionBeneficiada * 0.02) : 0,
        },
      });
      proaguaEnriched++;
    }
    console.log(`  Enriched ${proaguaEnriched} obras with PROAGUA ficha fields`);

    const entGto = entidadByClave.get('11');
    const entMor = entidadByClave.get('17');
    const muniLeon = municipioByName.get('León');
    const muniCuernavaca = municipioByName.get('Cuernavaca');
    const obraProagua2025 = obras.find((o) => o.folio === 'PROAGUA-2025-001');

    const solicitudesSeed: Array<{
      programa: string;
      ejercicioFiscal: number;
      entidadId: string;
      municipioId: string;
      tipoApoyo: string;
      componente: string;
      montoSolicitado: number;
      estatus: string;
      obraResultanteId?: string;
    }> = [];

    if (entGto && muniLeon) {
      solicitudesSeed.push({
        programa: 'PROAGUA',
        ejercicioFiscal: 2026,
        entidadId: entGto.id,
        municipioId: muniLeon.id,
        tipoApoyo: 'infraestructura',
        componente: 'AP',
        montoSolicitado: 12500000,
        estatus: 'borrador',
      });
    }
    if (entMor && muniCuernavaca) {
      solicitudesSeed.push({
        programa: 'PEAS',
        ejercicioFiscal: 2026,
        entidadId: entMor.id,
        municipioId: muniCuernavaca.id,
        tipoApoyo: 'fortalecimiento',
        componente: 'saneamiento',
        montoSolicitado: 8500000,
        estatus: 'presentada',
      });
    }
    if (entMor && muniCuernavaca && obraProagua2025) {
      solicitudesSeed.push({
        programa: 'PROAGUA',
        ejercicioFiscal: 2025,
        entidadId: entMor.id,
        municipioId: muniCuernavaca.id,
        tipoApoyo: 'infraestructura',
        componente: 'AP',
        montoSolicitado: Number(obraProagua2025.montoAutorizado),
        estatus: 'aprobada',
        obraResultanteId: obraProagua2025.id,
      });
    }

    for (const s of solicitudesSeed) {
      await prisma.solicitudPrograma.create({ data: s });
    }
    if (solicitudesSeed.length > 0) {
      console.log(`  Seeded ${solicitudesSeed.length} solicitudes programa (Anexo I)`);
    }

    const directorConagua = users.find((u) => u.rolConagua === 'director_conagua');
    if (directorConagua) {
      for (const cfg of PROAGUA_ALERTA_CONFIGS) {
        await prisma.alertaConfig.create({
          data: {
            nombre: cfg.nombre,
            descripcion: cfg.descripcion,
            activa: true,
            tipo: cfg.tipo,
            severidad: cfg.severidad,
            programaFiltro: cfg.programaFiltro,
            umbralDias: cfg.umbralDias,
            destinatariosJson: [
              {
                user_id: directorConagua.id,
                nombre: directorConagua.fullName,
                telefono: '5555550100',
              },
            ],
            creadoPor: directorConagua.id,
          },
        });
      }
      console.log(`  Seeded ${PROAGUA_ALERTA_CONFIGS.length} PROAGUA alerta configs`);
    }
  }

  let avanceCount = 0;
  for (const obra of obras) {
    let avanceReal = 0;
    for (let i = 0; i < 8; i++) {
      const programado = Math.min((i + 1) * 12.5, 100);
      const delta = -3 + (i % 3) * 2.5;
      avanceReal = Math.min(programado + delta, 100);
      const variacion = avanceReal - programado;
      await prisma.avanceMensual.create({
        data: {
          obraId: obra.id,
          periodo: `${MESES[i]} 2024`,
          programado,
          reportado: avanceReal,
          validado: i < 6 ? avanceReal : null,
          variacion,
          estatus: i < 6 ? EstatusAvance.validado : EstatusAvance.pendiente,
          actividades: `Actividades del mes de ${MESES[i]}: excavacion, cimentacion, mamposteria`,
          comentarios:
            variacion > -2 ? 'Sin observaciones' : `Variacion de ${variacion.toFixed(1)}% detectada`,
        },
      });
      avanceCount++;
    }
  }
  console.log(`  Seeded ${avanceCount} avance records`);

  let estimacionCount = 0;
  for (const obra of obras) {
    const avanceFin = Number(obra.avanceFinanciero);
    if (avanceFin <= 0) continue;
    const numEst = Math.max(1, Math.floor(avanceFin / 25));
    for (let i = 0; i < numEst; i++) {
      const pct = Math.min((i + 1) * 25, 100);
      const monto = Number(obra.montoContratado) * (pct / 100);
      const estatus =
        pct < avanceFin ? EstatusEstimacion.autorizada : EstatusEstimacion.presentada;
      await prisma.estimacion.create({
        data: {
          obraId: obra.id,
          numero: i + 1,
          periodo: `${(i + 1) * 2}-${(i + 1) * 2 + 1} 2024`,
          montoEstimado: monto * 0.25,
          montoAcumulado: monto,
          porcentajeFinanciero: pct,
          estatus,
          fechaPresentacion: `15-${(i + 1) * 2}-2024`,
          fechaRevision: estatus === EstatusEstimacion.autorizada ? `20-${(i + 1) * 2}-2024` : null,
          fechaAutorizacion:
            estatus === EstatusEstimacion.autorizada ? `25-${(i + 1) * 2}-2024` : null,
          validacionMunicipal: estatus === EstatusEstimacion.autorizada,
          validacionEstatal: estatus === EstatusEstimacion.autorizada,
          observaciones: '',
        },
      });
      estimacionCount++;
    }
  }
  console.log(`  Seeded ${estimacionCount} estimacion records`);

  let documentoCount = 0;
  for (const obra of obras) {
    for (let j = 0; j < DOC_CATEGORIAS.length; j++) {
      const estatus = DOC_ESTATUS[j % DOC_ESTATUS.length];
      await prisma.documento.create({
        data: {
          obraId: obra.id,
          categoria: DOC_CATEGORIAS[j],
          nombre: `${DOC_CATEGORIAS[j].replace(/_/g, ' ')} - ${obra.folio}`,
          tipo: 'pdf',
          estatus,
          fechaCarga: estatus === EstadoDocumento.cargado ? `2024-0${(j % 9) + 1}-15` : null,
          responsable: obra.supervisor,
        },
      });
      documentoCount++;
    }
  }
  console.log(`  Seeded ${documentoCount} documento records`);

  const tiposObs = ['supervision', 'seguimiento', 'calidad', 'documentacion', 'plazo'];
  const severidades = ['baja', 'media', 'alta'];
  const estatusObs = [
    EstatusObservacion.abierta,
    EstatusObservacion.en_atencion,
    EstatusObservacion.atendida,
  ];
  let observacionCount = 0;
  for (let i = 0; i < obras.length; i++) {
    if (i % 3 !== 0) continue;
    const obra = obras[i];
    for (let j = 0; j < 2; j++) {
      await prisma.observacion.create({
        data: {
          obraId: obra.id,
          usuarioEmisor: `Ing. Supervisor ${j + 1}`,
          fecha: `15-0${(j % 9) + 1}-2024`,
          tipo: tiposObs[j % tiposObs.length],
          descripcion: `Observacion ${j + 1} sobre ${tiposObs[j % tiposObs.length]} de la obra`,
          severidad: severidades[j % severidades.length],
          responsable: obra.supervisor,
          fechaCompromiso: `30-0${(j % 9) + 1}-2024`,
          estatus: estatusObs[j % estatusObs.length],
          respuestasJson: [],
        },
      });
      observacionCount++;
    }
  }
  console.log(`  Seeded ${observacionCount} observacion records`);

  const alertasData = loadJson<AlertaSeed[]>('alertas.json');
  for (const a of alertasData) {
    const mun = municipioByName.get(a.municipio);
    await prisma.alerta.create({
      data: {
        obraId: a.obra_id,
        municipio: a.municipio,
        municipioId: mun?.id,
        titulo: a.titulo,
        descripcion: a.descripcion,
        tipo: a.tipo,
        severidad: a.severidad,
        fechaGeneracion: a.fecha_generacion,
        atendida: a.atendida,
        accionTomada: a.accion_tomada,
      },
    });
  }
  console.log(`  Seeded ${alertasData.length} alerta records`);

  console.log('='.repeat(60));
  console.log('Seed completed successfully!');
  console.log(`Default login: ${demoEmail('estatal')} / ${tenant.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
