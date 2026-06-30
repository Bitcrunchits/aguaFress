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
import jwtConfig from './common/config/env.config';

//
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                                                              ║
// ║   ⚠️  ATENCIÓN — PRÓXIMO PASO IMPORTANTE  ⚠️                                  ║
// ║                                                                              ║
// ║   @nestjs/event-emitter YA ESTÁ INSTALADO y EventEmitterModule.forRoot()     ║
// ║   ya está importado abajo. Lo que FALTA es:                                  ║
// ║                                                                              ║
// ║   1. Crear eventos de dominio (ej: VendedorActivadoEvent)                    ║
// ║   2. Dispararlos con eventEmitter.emit() en los services                     ║
// ║   3. Escucharlos con @OnEvent() en listeners                                 ║
// ║                                                                              ║
// ║   ⛔  NO USAR event-emitter para comunicación entre microservicios.           ║
// ║       Eso va por KAFKA (TCP + Kafka, decidido en la arquitectura).           ║
// ║                                                                              ║
// ║   🔜  CUANDO SE CONECTE KAFKA:                                               ║
// ║       - Los listeners @OnEvent() actuales se reemplazan por un                ║
// ║         Kafka Producer que publica los eventos al bus                         ║
// ║       - O los listeners actuales llaman al producer internamente              ║
// ║       - Ver diseño en openspec/changes/vendedores-module/ para contexto       ║
// ║                                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//

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
  ],
})
export class AppModule {}
