import { Module } from '@nestjs/common';
import { ObrasFisicasController } from './obras-fisicas.controller';
import { ObrasFisicasService } from './obras-fisicas.service';

@Module({
  controllers: [ObrasFisicasController],
  providers: [ObrasFisicasService],
  exports: [ObrasFisicasService],
})
export class ObrasFisicasModule {}
