import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VendedoresModule } from './vendedores/vendedores.module';
import { ClientesModule } from './clientes/clientes.module';
import { CommonModule } from './common/common.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { QrCodesModule } from './qr-codes/qr-codes.module';
import { LinkInvitacionModule } from './link-invitacion/link-invitacion.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { TcpModule } from './tcp/tcp.module';
import jwtConfig from './common/config/env.config';

// TODO: implement Kafka producer when ready

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [jwtConfig] }),
    EventEmitterModule.forRoot(),
    AuthModule,
    UsersModule,
    VendedoresModule,
    ClientesModule,
    CommonModule,
    SuperAdminModule,
    QrCodesModule,
    LinkInvitacionModule,
    AuditLogModule,
    TcpModule,
  ],
})
export class AppModule {}
