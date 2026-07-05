import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { UpdateSuperAdminProfileDto } from './dto/update-super-admin.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@agua/contracts';

@ApiTags('Super Admin')
@Controller('super-admin')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get super admin profile', description: 'Returns the authenticated super admin\'s profile' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.superAdminService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update super admin profile', description: 'Updates the super admin\'s profile' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateSuperAdminProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateSuperAdminProfileDto,
  ) {
    return this.superAdminService.updateProfile(userId, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard', description: 'Returns dashboard data for super admin' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard() {
    return this.superAdminService.getDashboard();
  }
}
