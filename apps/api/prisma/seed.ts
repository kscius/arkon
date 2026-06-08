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
  if (tenant === 'ceaspue') {
    return { domain: 'sigopem.gob.mx', password: 'Sigopem2024!', label: 'CEASPUE' };
  }
  return { domain: 'arkon.gob.mx', password: 'Arkon2024!', label: 'ARKON' };
}

function demoEmail(localPart: string): string {
  return `${localPart}@${demoTenant().domain}`;
}

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(seedDir, name), 'utf-8')) as T;
}

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

async function main() {
  const tenant = demoTenant();
  const programasCanonicos = programasCanonicosForTenant();
  console.log(`${tenant.label} Database Seeder`);
  console.log(`  Seed data: ${seedDir}`);
  console.log('='.repeat(60));

  await prisma.$transaction([
    prisma.alerta.deleteMany(),
    prisma.observacion.deleteMany(),
    prisma.documento.deleteMany(),
    prisma.estimacion.deleteMany(),
    prisma.avanceMensual.deleteMany(),
    prisma.obra.deleteMany(),
    prisma.usuario.deleteMany(),
    prisma.contratista.deleteMany(),
    prisma.municipio.deleteMany(),
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

  const municipiosData = loadJson<MunicipioSeed[]>('municipios.json');
  const municipios = await Promise.all(
    municipiosData.map((m) =>
      prisma.municipio.create({
        data: { nombre: m.nombre, latitud: m.latitud, longitud: m.longitud },
      }),
    ),
  );
  console.log(`  Seeded ${municipios.length} municipios`);

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
    },
    {
      email: demoEmail('coordinador'),
      fullName: 'Ing. Jorge Luis Martinez',
      rol: Rol.estatal,
      avatarInitials: 'JM',
      municipioId: null,
      contratistaId: null,
    },
    {
      email: demoEmail('municipal.centro'),
      fullName: 'Arq. Laura Patricia Mendez',
      rol: Rol.municipal,
      avatarInitials: 'LM',
      municipioId: municipioAt(0),
      contratistaId: null,
    },
    {
      email: demoEmail('municipal.norte'),
      fullName: 'Ing. Roberto Carlos Diaz',
      rol: Rol.municipal,
      avatarInitials: 'RD',
      municipioId: municipioAt(1),
      contratistaId: null,
    },
    {
      email: demoEmail('municipal.valle'),
      fullName: 'Lic. Maria Fernanda Ruiz',
      rol: Rol.municipal,
      avatarInitials: 'MR',
      municipioId: municipioAt(2),
      contratistaId: null,
    },
    {
      email: demoEmail('municipal.sur'),
      fullName: 'Ing. Jose Antonio Flores',
      rol: Rol.municipal,
      avatarInitials: 'JF',
      municipioId: municipioAt(3),
      contratistaId: null,
    },
    {
      email: demoEmail('cce'),
      fullName: 'Ing. Carlos Mendez Rodriguez',
      rol: Rol.contratista,
      avatarInitials: 'CM',
      municipioId: null,
      contratistaId: contratistas[0].id,
    },
    {
      email: demoEmail('gdp'),
      fullName: 'Arq. Maria Elena Torres',
      rol: Rol.contratista,
      avatarInitials: 'MT',
      municipioId: null,
      contratistaId: contratistas[1].id,
    },
    {
      email: demoEmail('ies'),
      fullName: 'Ing. Roberto Hernandez Lopez',
      rol: Rol.contratista,
      avatarInitials: 'RH',
      municipioId: null,
      contratistaId: contratistas[2].id,
    },
  ];

  await Promise.all(
    usersData.map((u) =>
      prisma.usuario.create({
        data: { ...u, passwordHash, isActive: true },
      }),
    ),
  );
  console.log(`  Seeded ${usersData.length} users`);

  const obrasData = loadJson<ObraSeed[]>('obras.json');
  const obras = await Promise.all(
    obrasData.map((o, i) =>
      prisma.obra.create({
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
          contratistaId: contratistas[i % contratistas.length].id,
        },
      }),
    ),
  );
  console.log(`  Seeded ${obras.length} obras`);

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
