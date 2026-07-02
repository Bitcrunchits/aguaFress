import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LinkInvitacionService } from './link-invitacion.service';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListLinkInvitacionDto } from './dto/list-link-invitacion.dto';

@Controller('link-invitacion')
@UseGuards(AuthGuard('jwt'), VendedorGuard)
export class LinkInvitacionVendorController {
  constructor(
    private readonly linkInvitacionService: LinkInvitacionService,
    private readonly resolver: VendedorResolver,
  ) {}

  @Post()
  async create(@CurrentUser('userId') userId: string) {
    const vendedorId = await this.resolver.resolve(userId);
    const link = await this.linkInvitacionService.create(vendedorId);
    return {
      linkUrl: `https://agua.app/invitar/${link.token}`,
      token: link.token,
      expiresAt: link.expires_at.toISOString(),
    };
  }

  @Get()
  async list(
    @CurrentUser('userId') userId: string,
    @Query() dto: ListLinkInvitacionDto,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.linkInvitacionService.list(vendedorId, dto);
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.linkInvitacionService.deactivate(id, vendedorId);
  }
}
