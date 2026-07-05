import {
  BadRequestException,
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@agua/contracts';
import { LinkInvitacionService } from './link-invitacion.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListLinkInvitacionDto } from './dto/list-link-invitacion.dto';

@Controller('admin/link-invitacion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiTags('Link Invitación (Admin)')
@ApiBearerAuth()
export class LinkInvitacionAdminController {
  constructor(
    private readonly linkInvitacionService: LinkInvitacionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all invitation links (admin)', description: 'List invitation links for a specific vendedor' })
  @ApiResponse({ status: 200, description: 'Invitation links list retrieved' })
  @ApiResponse({ status: 400, description: 'vendedorId is required' })
  async list(@Query() dto: ListLinkInvitacionDto) {
    if (!dto.vendedorId) {
      throw new BadRequestException('vendedorId is required');
    }
    return this.linkInvitacionService.listByVendedor(dto.vendedorId, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate invitation link (admin)', description: 'Admin force-deactivate any invitation link' })
  @ApiResponse({ status: 200, description: 'Invitation link deactivated' })
  @ApiResponse({ status: 404, description: 'Invitation link not found' })
  async deactivate(@Param('id') id: string) {
    return this.linkInvitacionService.deactivateAdmin(id);
  }
}
