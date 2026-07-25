import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { ClientesModule } from '../clientes/clientes.module';
import { CommonModule } from '../common/common.module';
import { UploadModule } from '../common/upload/upload.module';
import { LinkInvitacionModule } from '../link-invitacion/link-invitacion.module';
import { QrCodesModule } from '../qr-codes/qr-codes.module';
import { SuperAdminModule } from '../super-admin/super-admin.module';
import { UsersModule } from '../users/users.module';
import { VendedoresModule } from '../vendedores/vendedores.module';
import { AuthTcpController } from './auth-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import { UsersTcpController } from './users-tcp.controller';
import { UsuarioDomainTcpController } from './usuario-domain-tcp.controller';
import { UsuarioUploadTcpController } from './upload-tcp.controller';

@Module({
  imports: [
    AuditLogModule,
    AuthModule,
    ClientesModule,
    CommonModule,
    UploadModule,
    LinkInvitacionModule,
    QrCodesModule,
    SuperAdminModule,
    UsersModule,
    VendedoresModule,
  ],
  controllers: [AuthTcpController, UsersTcpController, UsuarioDomainTcpController, UsuarioUploadTcpController],
  providers: [TcpPayloadAdapter],
})
export class TcpModule {}
