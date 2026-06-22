import { Module } from '@nestjs/common';
import { ProaguaExportController } from './proagua-export.controller';
import { ProaguaExportService } from './proagua-export.service';

@Module({ controllers: [ProaguaExportController], providers: [ProaguaExportService] })
export class ProaguaExportModule {}
