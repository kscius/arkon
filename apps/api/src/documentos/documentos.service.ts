import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoriaDocumento, EstadoDocumento, Usuario } from '@prisma/client';
import { createReadStream, existsSync } from 'fs';
import { basename } from 'path';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private map(d: {
    id: string;
    categoria: CategoriaDocumento;
    nombre: string;
    tipo: string;
    estatus: EstadoDocumento;
    fechaCarga: string | null;
    responsable: string | null;
    archivo: string | null;
    tamanoBytes: number | null;
  }) {
    return {
      id: d.id,
      categoria: d.categoria,
      nombre: d.nombre,
      tipo: d.tipo,
      estatus: d.estatus,
      fecha_carga: d.fechaCarga,
      responsable: d.responsable ?? '',
      archivo: d.archivo,
      tamano_bytes: d.tamanoBytes,
    };
  }

  async listByObra(obraId: string, user: Usuario) {
    await this.scope.getObraOrThrow(obraId, user);
    const rows = await this.prisma.documento.findMany({
      where: { obraId },
      orderBy: { nombre: 'asc' },
    });
    return rows.map((d) => this.map(d));
  }

  async create(
    obraId: string,
    data: {
      categoria: CategoriaDocumento;
      nombre: string;
      tipo?: string;
      estatus?: EstadoDocumento;
      fecha_carga?: string;
      responsable?: string;
      archivo?: string;
      tamano_bytes?: number;
    },
    user: Usuario,
  ) {
    await this.scope.getObraOrThrow(obraId, user);
    if (data.tamano_bytes && data.tamano_bytes > MAX_BYTES) {
      throw new BadRequestException('File exceeds 10MB limit');
    }
    const doc = await this.prisma.documento.create({
      data: {
        obraId,
        categoria: data.categoria,
        nombre: data.nombre,
        tipo: data.tipo ?? 'pdf',
        estatus: data.estatus ?? EstadoDocumento.cargado,
        fechaCarga: data.fecha_carga,
        responsable: data.responsable ?? user.fullName,
        archivo: data.archivo,
        tamanoBytes: data.tamano_bytes,
      },
    });
    return this.map(doc);
  }

  async updateStatus(id: string, estatus: EstadoDocumento, user: Usuario) {
    const doc = await this.prisma.documento.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException();
    await this.scope.getObraOrThrow(doc.obraId, user);
    return this.prisma.documento.update({ where: { id }, data: { estatus } });
  }

  async openFile(id: string, user: Usuario) {
    const doc = await this.prisma.documento.findUnique({ where: { id } });
    if (!doc?.archivo) throw new NotFoundException('File not found');
    await this.scope.getObraOrThrow(doc.obraId, user);
    const filePath = doc.archivo;
    if (!existsSync(filePath)) throw new NotFoundException('File missing on disk');
    return {
      stream: createReadStream(filePath),
      filename: basename(filePath),
      mime: doc.tipo === 'pdf' ? 'application/pdf' : 'application/octet-stream',
    };
  }

  static validateUpload(mimetype: string, size: number) {
    if (!ALLOWED_MIME.includes(mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: PDF, JPG, PNG');
    }
    if (size > MAX_BYTES) throw new BadRequestException('File exceeds 10MB');
  }

}
