import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { UpdateSuperAdminProfileDto } from './dto/update-super-admin.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@agua/contracts';

@Controller('super-admin')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('me')
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.superAdminService.getProfile(userId);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateSuperAdminProfileDto,
  ) {
    return this.superAdminService.updateProfile(userId, dto);
  }

  @Get('dashboard')
  async getDashboard() {
    return this.superAdminService.getDashboard();
  }
}
