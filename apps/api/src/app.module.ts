import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AlertasModule } from './alertas/alertas.module';
import { AvancesModule } from './avances/avances.module';
import { ChatModule } from './chat/chat.module';
import { ContratistasModule } from './contratistas/contratistas.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentosModule } from './documentos/documentos.module';
import { EstimacionesModule } from './estimaciones/estimaciones.module';
import { HealthModule } from './health/health.module';
import { MunicipiosModule } from './municipios/municipios.module';
import { ObservacionesModule } from './observaciones/observaciones.module';
import { ObrasModule } from './obras/obras.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MunicipiosModule,
    ContratistasModule,
    ObrasModule,
    AvancesModule,
    EstimacionesModule,
    DocumentosModule,
    ObservacionesModule,
    AlertasModule,
    DashboardModule,
    ChatModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
