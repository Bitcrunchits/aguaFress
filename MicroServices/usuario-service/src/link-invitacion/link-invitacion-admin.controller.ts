import {
  BadRequestException,
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@agua/contracts';
import { LinkInvitacionService } from './link-invitacion.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListLinkInvitacionDto } from './dto/list-link-invitacion.dto';

@Controller('admin/link-invitacion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class LinkInvitacionAdminController {
  constructor(
    private readonly linkInvitacionService: LinkInvitacionService,
  ) {}

  @Get()
  async list(@Query() dto: ListLinkInvitacionDto) {
    if (!dto.vendedorId) {
      throw new BadRequestException('vendedorId is required');
    }
    return this.linkInvitacionService.listByVendedor(dto.vendedorId, dto);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.linkInvitacionService.deactivateAdmin(id);
  }
}
