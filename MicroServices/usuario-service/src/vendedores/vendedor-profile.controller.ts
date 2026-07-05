import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { VendedoresService } from './vendedores.service';
import { UpdateVendedorProfileDto } from './dto/update-vendedor-profile.dto';
import { VendedorGuard } from './guards/vendedor.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('vendedores/me')
@UseGuards(VendedorGuard)
@ApiTags('Vendedores (Profile)')
@ApiBearerAuth()
export class VendedorProfileController {
  constructor(private readonly vendedoresService: VendedoresService) {}

  @Get()
  @ApiOperation({ summary: 'Get my vendedor profile', description: "Returns the authenticated vendedor's own profile" })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProfile(@CurrentUser('userId') userId: string) {
    return this.vendedoresService.getMyProfile(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update my vendedor profile', description: "Updates the authenticated vendedor's own profile" })
  @ApiBody({ type: UpdateVendedorProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async updateMyProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateVendedorProfileDto,
  ) {
    return this.vendedoresService.updateMyProfile(userId, dto);
  }
}
