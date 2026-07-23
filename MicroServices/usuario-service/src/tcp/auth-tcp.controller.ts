import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from '../auth/auth.service';
import { Public } from '../auth/decorators/public.decorator';
import { LoginDto } from '../auth/dto/login.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { RefreshTokenDto } from '../auth/dto/refresh-token.dto';
import { ValidateTokenDto } from '../auth/dto/validate-token.dto';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { AdminGenerateResetTokenDto } from '../auth/dto/admin-generate-reset-token.dto';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';

@Controller()
@Public()
export class AuthTcpController {
  constructor(
    private readonly authService: AuthService,
    private readonly payloadAdapter: TcpPayloadAdapter,
  ) {}

  @MessagePattern('auth.login')
  async login(@Payload() payload: TcpPayload) {
    const dto = await this.payloadAdapter.body(payload, LoginDto);
    return this.authService.login(dto);
  }

  @MessagePattern('auth.register')
  async register(@Payload() payload: TcpPayload) {
    const dto = await this.payloadAdapter.body(payload, RegisterDto);
    return this.authService.register(dto);
  }

  @MessagePattern('auth.refresh')
  async refresh(@Payload() payload: TcpPayload) {
    const dto = await this.payloadAdapter.body(payload, RefreshTokenDto);
    return this.authService.refresh(dto.refreshToken);
  }

  @MessagePattern('auth.validate')
  async validate(@Payload() payload: TcpPayload) {
    const dto = await this.payloadAdapter.body(payload, ValidateTokenDto);
    return this.authService.validate(dto.token);
  }

  @MessagePattern('auth.admin_generate_reset_token')
  async adminGenerateResetToken(@Payload() payload: TcpPayload) {
    const adminUserId = this.payloadAdapter.userId(payload);
    const dto = await this.payloadAdapter.body(payload, AdminGenerateResetTokenDto);
    return this.authService.adminGenerateResetToken(adminUserId, dto);
  }

  @MessagePattern('auth.reset_password')
  async resetPassword(@Payload() payload: TcpPayload) {
    const dto = await this.payloadAdapter.body(payload, ResetPasswordDto);
    return this.authService.resetPassword(dto);
  }

  @MessagePattern('auth.change_password')
  async changePassword(@Payload() payload: TcpPayload) {
    const userId = this.payloadAdapter.userId(payload);
    const dto = await this.payloadAdapter.body(payload, ChangePasswordDto);
    return this.authService.changePassword(userId, dto);
  }

  @MessagePattern('auth.logout')
  logout(@Payload() payload: TcpPayload) {
    return this.authService.logout(this.payloadAdapter.userId(payload));
  }
}
