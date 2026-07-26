import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export interface SaveImageInput {
  readonly base64: string;
  readonly mimetype: string;
}

@Injectable()
export class UploadService {
  constructor(private readonly config: ConfigService) {}

  async saveImage(data: SaveImageInput, subdir: string): Promise<string> {
    if (!ALLOWED_MIMES.has(data.mimetype)) {
      throw new BadRequestException(
        `Formato no soportado: ${data.mimetype}. Permitidos: JPEG, PNG, WebP, AVIF.`,
      );
    }

    const buffer = Buffer.from(data.base64, 'base64');

    const maxSize = (this.config.get<number>('upload.maxSizeMb', 5)) * 1024 * 1024;
    if (buffer.byteLength > maxSize) {
      throw new BadRequestException(
        `Archivo excede el tamaño máximo de ${maxSize / 1024 / 1024}MB`,
      );
    }

    const webpBuffer = await sharp(buffer)
      .webp({ quality: this.config.get<number>('upload.webpQuality', 80) })
      .toBuffer();

    const id = nanoid();
    const filename = `${id}.webp`;

    const uploadDir = this.config.get<string>('upload.dir', './public/uploads');
    const fullPath = path.join(uploadDir, subdir, filename);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, webpBuffer);

    return `${subdir}/${filename}`;
  }
}
