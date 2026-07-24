import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Public } from '../auth/decorators/public.decorator';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';

@Controller()
@Public()
export class UsersTcpController {
  constructor(
    private readonly usersService: UsersService,
    private readonly payloadAdapter: TcpPayloadAdapter,
  ) {}

  @MessagePattern('users.profile')
  profile(@Payload() payload: TcpPayload) {
    return this.usersService.getProfile(this.payloadAdapter.userId(payload));
  }

  @MessagePattern('users.profile_update')
  async updateProfile(@Payload() payload: TcpPayload) {
    const userId = this.payloadAdapter.userId(payload);
    const dto = await this.payloadAdapter.body(payload, UpdateProfileDto);
    return this.usersService.updateProfile(userId, dto);
  }
}
