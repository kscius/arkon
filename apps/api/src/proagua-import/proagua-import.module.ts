import { Module } from '@nestjs/common';
import { ProaguaImportController } from './proagua-import.controller';
import { ProaguaImportService } from './proagua-import.service';

@Module({ controllers: [ProaguaImportController], providers: [ProaguaImportService] })
export class ProaguaImportModule {}
