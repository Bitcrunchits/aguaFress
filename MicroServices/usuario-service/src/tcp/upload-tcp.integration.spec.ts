import { type INestMicroservice } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, ServerTCP, Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import { UserRole } from '@agua/contracts';

jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { PrismaService } from '../common/prisma/prisma.service';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import { UploadModule } from '../common/upload/upload.module';
import { UploadService } from '../common/upload/upload.service';
import { RpcExceptionFilter } from '../common/filters/rpc-exception.filter';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';
import { UsuarioUploadTcpController } from './upload-tcp.controller';

class EphemeralTcpServer extends ServerTCP {
  constructor() {
    super({ host: '127.0.0.1' });
  }

  override listen(callback: (err?: unknown, ...optionalParams: unknown[]) => void): void {
    this.server.once('error', callback);
    this.server.listen(0, '127.0.0.1', () => {
      this.server.removeListener('error', callback);
      callback();
    });
  }

  getBoundPort(): number {
    const address = this.server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Test TCP server is not listening');
    }
    return address.port;
  }
}

const mockResolver = { resolveActive: jest.fn().mockResolvedValue('vendor-1') };
const mockUpload = { saveImage: jest.fn().mockResolvedValue('logos/logo.webp') };

function vendorPayload(): TcpPayload {
  return {
    requestId: 'upload-request-1',
    body: { file: Buffer.from('image').toString('base64'), mimetype: 'image/png' },
    user: { sub: 'auth-user-1', email: 'vendor@example.com', role: UserRole.VENDEDOR },
  };
}

describe('users.upload_logo over Nest TCP', () => {
  let app: INestMicroservice;
  let client: ClientProxy;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [() => ({ jwt: { secret: 'test-secret' } })] }),
        CommonModule,
        AuditLogModule,
        AuthModule,
        UploadModule,
      ],
      controllers: [UsuarioUploadTcpController],
      providers: [TcpPayloadAdapter],
    })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .overrideProvider(VendedorResolver)
      .useValue(mockResolver)
      .overrideProvider(AuditLogService)
      .useValue({ record: jest.fn() })
      .overrideProvider(UploadService)
      .useValue(mockUpload)
      .compile();

    const server = new EphemeralTcpServer();
    app = moduleRef.createNestMicroservice<MicroserviceOptions>({ strategy: server, logger: false });
    app.useGlobalFilters(new RpcExceptionFilter());
    await app.listen();

    client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: server.getBoundPort() },
    });
    await client.connect();
  });

  afterAll(async () => {
    client?.close();
    await app?.close();
  });

  beforeEach(() => {
    mockResolver.resolveActive.mockClear();
    mockUpload.saveImage.mockClear();
  });

  it('uploads a logo for an active vendor without an HTTP authorization header', async () => {
    const response = await firstValueFrom(client.send<{ imageId: string }>('users.upload_logo', vendorPayload()));

    expect(response).toEqual({ imageId: 'logos/logo.webp' });
    expect(mockResolver.resolveActive).toHaveBeenCalledWith('auth-user-1');
    expect(mockUpload.saveImage).toHaveBeenCalledWith(
      { base64: Buffer.from('image').toString('base64'), mimetype: 'image/png' },
      'logos',
    );
  });

  it('rejects a payload without a user before resolving the vendor', async () => {
    await expect(firstValueFrom(client.send('users.upload_logo', { ...vendorPayload(), user: undefined })))
      .rejects.toMatchObject({ message: 'Authenticated user is required' });

    expect(mockResolver.resolveActive).not.toHaveBeenCalled();
    expect(mockUpload.saveImage).not.toHaveBeenCalled();
  });

  it('rejects a non-vendor role before resolving the vendor', async () => {
    const payload: TcpPayload = {
      ...vendorPayload(),
      user: { sub: 'client-user-1', email: 'client@example.com', role: UserRole.CLIENTE },
    };

    await expect(firstValueFrom(client.send('users.upload_logo', payload)))
      .rejects.toMatchObject({ message: 'Insufficient role for TCP handler' });

    expect(mockResolver.resolveActive).not.toHaveBeenCalled();
    expect(mockUpload.saveImage).not.toHaveBeenCalled();
  });
});
