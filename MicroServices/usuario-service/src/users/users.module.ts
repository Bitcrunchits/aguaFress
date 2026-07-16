import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  imports: [],  // AuthModule guards come from global APP_GUARD
  controllers: [],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
