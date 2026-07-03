import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AccionesProgramaModule } from './acciones-programa/acciones-programa.module';
import { AlertaConfigsModule } from './alerta-configs/alerta-configs.module';
import { AlertasModule } from './alertas/alertas.module';
import { AnexosEjecucionModule } from './anexos-ejecucion/anexos-ejecucion.module';
import { AvancesModule } from './avances/avances.module';
import { AvancesTrimestralesModule } from './avances-trimestrales/avances-trimestrales.module';
import { ChatModule } from './chat/chat.module';
import { CierresEjercicioModule } from './cierres-ejercicio/cierres-ejercicio.module';
import { CofinanciamientosModule } from './cofinanciamientos/cofinanciamientos.module';
import { ContratistasModule } from './contratistas/contratistas.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentosModule } from './documentos/documentos.module';
import { EntidadesFederativasModule } from './entidades-federativas/entidades-federativas.module';
import { EstimacionesModule } from './estimaciones/estimaciones.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { MunicipiosModule } from './municipios/municipios.module';
import { ObservacionesModule } from './observaciones/observaciones.module';
import { ObrasModule } from './obras/obras.module';
import { ObrasFisicasModule } from './obras-fisicas/obras-fisicas.module';
import { ProgramasModule } from './programas/programas.module';
import { OrganismosOperadoresModule } from './organismos-operadores/organismos-operadores.module';
import { ProaguaExportModule } from './proagua-export/proagua-export.module';
import { ProaguaImportModule } from './proagua-import/proagua-import.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { SolicitudesProgramaModule } from './solicitudes-programa/solicitudes-programa.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MunicipiosModule,
    ContratistasModule,
    EntidadesFederativasModule,
    OrganismosOperadoresModule,
    AccionesProgramaModule,
    ObrasModule,
    ObrasFisicasModule,
    ProgramasModule,
    AvancesModule,
    AvancesTrimestralesModule,
    CofinanciamientosModule,
    AnexosEjecucionModule,
    CierresEjercicioModule,
    SolicitudesProgramaModule,
    ProaguaExportModule,
    ProaguaImportModule,
    EstimacionesModule,
    DocumentosModule,
    ObservacionesModule,
    AlertasModule,
    AlertaConfigsModule,
    DashboardModule,
    MetricsModule,
    ChatModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
