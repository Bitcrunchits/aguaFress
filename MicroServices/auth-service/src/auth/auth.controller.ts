import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.register')
  async register(@Payload() dto: any) {
    return this.authService.register(dto);
  }

  @MessagePattern('auth.login')
  async login(@Payload() dto: any) {
    return this.authService.login(dto);
  }

  @MessagePattern('auth.refresh')
  async refresh(@Payload() dto: any) {
    return this.authService.refresh(dto);
  }

  @MessagePattern('auth.logout')
  async logout(@Payload() dto: any) {
    return this.authService.logout(dto);
  }
}
