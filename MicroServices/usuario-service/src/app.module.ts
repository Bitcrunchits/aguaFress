import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import jwtConfig from './common/config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [jwtConfig] }),
    AuthModule,
    UsersModule,
    CommonModule,
  ],
})
export class AppModule {}
