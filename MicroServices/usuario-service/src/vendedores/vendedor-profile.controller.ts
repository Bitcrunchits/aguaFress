import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { VendedoresService } from './vendedores.service';
import { UpdateVendedorProfileDto } from './dto/update-vendedor-profile.dto';
import { VendedorGuard } from './guards/vendedor.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('vendedores/me')
@UseGuards(VendedorGuard)
export class VendedorProfileController {
  constructor(private readonly vendedoresService: VendedoresService) {}

  @Get()
  async getMyProfile(@CurrentUser('userId') userId: string) {
    return this.vendedoresService.getMyProfile(userId);
  }

  @Patch()
  async updateMyProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateVendedorProfileDto,
  ) {
    return this.vendedoresService.updateMyProfile(userId, dto);
  }
}
