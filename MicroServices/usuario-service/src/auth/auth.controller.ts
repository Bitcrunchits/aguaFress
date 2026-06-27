import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterVendedorDto } from './dto/register-vendedor.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('register/vendedor')
  @HttpCode(HttpStatus.CREATED)
  async registerVendedor(
    @Body() dto: RegisterVendedorDto,
  ) {
    return this.authService.registerVendedor(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(
    @Body('token') token: string,
  ) {
    return this.authService.validate(token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    return this.authService.logout();
  }
}
