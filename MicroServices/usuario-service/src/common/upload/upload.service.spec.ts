import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import sharp = require('sharp');

jest.mock('nanoid', () => ({ nanoid: () => 'test-image-id' }));

import { UploadService } from './upload.service';

describe('UploadService', () => {
  let uploadDir: string;
  let service: UploadService;

  beforeEach(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), 'usuarios-upload-'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue: unknown) =>
              key === 'upload.dir' ? uploadDir : defaultValue,
          },
        },
      ],
    }).compile();

    service = module.get(UploadService);
  });

  afterEach(async () => {
    await rm(uploadDir, { recursive: true, force: true });
  });

  it('converts a PNG to WebP in the configured logos directory', async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: { r: 20, g: 60, b: 120 } },
    }).png().toBuffer();

    const imageId = await service.saveImage(
      { base64: png.toString('base64'), mimetype: 'image/png' },
      'logos',
    );

    expect(imageId).toBe('logos/test-image-id.webp');
    const image = await readFile(join(uploadDir, imageId));
    expect(await sharp(image).metadata()).toMatchObject({ format: 'webp', width: 2, height: 2 });
  });
});
