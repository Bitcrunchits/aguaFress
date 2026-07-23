import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { UsuarioClientModule } from '../common/usuario-client/usuario-client.module';
import { VENDEDOR_PROFILE_RESOLVER_PORT } from '../common/usuario-client/vendedor-profile-resolver.port';
import { TcpVendedorProfileResolverAdapter } from '../common/usuario-client/tcp-vendedor-profile-resolver.adapter';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsTcpController } from './products-tcp.controller';
import { CategoriesTcpController } from './categories-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';

@Module({
  imports: [CommonModule, UsuarioClientModule, ProductsModule, CategoriesModule],
  controllers: [ProductsTcpController, CategoriesTcpController],
  providers: [
    TcpPayloadAdapter,
    { provide: VENDEDOR_PROFILE_RESOLVER_PORT, useClass: TcpVendedorProfileResolverAdapter },
  ],
})
export class TcpModule {}
