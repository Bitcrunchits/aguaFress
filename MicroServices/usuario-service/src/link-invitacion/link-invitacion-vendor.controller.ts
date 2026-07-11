import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LinkInvitacionService } from './link-invitacion.service';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListLinkInvitacionDto } from './dto/list-link-invitacion.dto';

@Controller('link-invitacion')
@UseGuards(VendedorGuard)
@ApiTags('Link Invitación (Vendor)')
@ApiBearerAuth()
export class LinkInvitacionVendorController {
  constructor(
    private readonly linkInvitacionService: LinkInvitacionService,
    private readonly resolver: VendedorResolver,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create invitation link', description: 'Generate a new time-limited invitation link' })
  @ApiResponse({ status: 201, description: 'Invitation link created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@CurrentUser('userId') userId: string) {
    const vendedorId = await this.resolver.resolve(userId);
    const link = await this.linkInvitacionService.create(vendedorId, userId);
    return {
      linkUrl: `https://agua.app/invitar/${link.token}`,
      token: link.token,
      expiresAt: link.expires_at.toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List invitation links', description: "List the vendor's invitation links with pagination" })
  @ApiResponse({ status: 200, description: 'Invitation links list retrieved' })
  async list(
    @CurrentUser('userId') userId: string,
    @Query() dto: ListLinkInvitacionDto,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.linkInvitacionService.list(vendedorId, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate invitation link', description: 'Deactivate an invitation link' })
  @ApiResponse({ status: 200, description: 'Invitation link deactivated' })
  @ApiResponse({ status: 404, description: 'Invitation link not found' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.linkInvitacionService.deactivate(id, vendedorId);
  }
}
