import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { SuperAdminService } from './super-admin.service';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
