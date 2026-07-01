import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CategoriaDocumento, EstadoDocumento, Usuario } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DocumentosService } from './documentos.service';

const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('Documentos')
@ApiBearerAuth()
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  @Get('accion/:obraId')
  list(@Param('obraId') obraId: string, @CurrentUser() user: Usuario) {
    return this.service.listByObra(obraId, user);
  }

  @Post('accion/:obraId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname) || '.bin';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  create(
    @Param('obraId') obraId: string,
    @Body() body: Record<string, string>,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: Usuario,
  ) {
    if (file) {
      DocumentosService.validateUpload(file.mimetype, file.size);
    }
    return this.service.create(
      obraId,
      {
        categoria: body.categoria as CategoriaDocumento,
        nombre: body.nombre,
        tipo: body.tipo,
        estatus: body.estatus as EstadoDocumento | undefined,
        fecha_carga: body.fecha_carga,
        responsable: body.responsable,
        archivo: file ? join(uploadDir, file.filename) : undefined,
        tamano_bytes: file?.size,
      },
      user,
    );
  }

  @Get(':id/file')
  async downloadFile(@Param('id') id: string, @CurrentUser() user: Usuario) {
    const { stream, filename, mime } = await this.service.openFile(id, user);
    return new StreamableFile(stream, {
      type: mime,
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Patch(':id')
  updateStatus(
    @Param('id') id: string,
    @Query('estatus') estatus: EstadoDocumento,
    @CurrentUser() user: Usuario,
  ) {
    if (!estatus) throw new BadRequestException('estatus query param required');
    return this.service.updateStatus(id, estatus, user);
  }
}
