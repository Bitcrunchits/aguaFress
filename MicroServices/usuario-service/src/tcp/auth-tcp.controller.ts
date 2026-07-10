import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from '../auth/auth.service';
import { Public } from '../auth/decorators/public.decorator';
import { LoginDto } from '../auth/dto/login.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { RegisterVendedorDto } from '../auth/dto/register-vendedor.dto';
import { RefreshTokenDto } from '../auth/dto/refresh-token.dto';
import { ValidateTokenDto } from '../auth/dto/validate-token.dto';
import { UsersService } from '../users/users.service';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';

@Controller()
@Public()
export class AuthTcpController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
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

  @MessagePattern('auth.register_vendedor')
  async registerVendedor(@Payload() payload: TcpPayload) {
    const dto = await this.payloadAdapter.body(payload, RegisterVendedorDto);
    return this.authService.registerVendedor(dto);
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

  @MessagePattern('auth.me')
  me(@Payload() payload: TcpPayload) {
    return this.usersService.getProfile(this.payloadAdapter.userId(payload));
  }

  @MessagePattern('auth.logout')
  logout(@Payload() payload: TcpPayload) {
    return this.authService.logout(this.payloadAdapter.userId(payload));
  }
}
