import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TokenService } from './token.service';
import * as bcrypt from 'bcrypt';
import { UserRole, VendedorEstado } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { RegisterVendedorDto } from './dto/register-vendedor.dto';
import { LoginDto } from './dto/login.dto';
import { AuditAction } from '@agua/contracts';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private mapRoleToPrisma(role: string): 'cliente' | 'vendedor' {
    if (role === UserRole.super_admin) throw new ForbiddenException('Cannot register as super admin');
    switch (role) {
      case UserRole.cliente:
        return 'cliente';
      case UserRole.vendedor:
        return 'vendedor';
      default:
        throw new BadRequestException('Invalid role');
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.authUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.authUser.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: this.mapRoleToPrisma(dto.role),
        },
      });

      if (dto.role === UserRole.cliente) {
        // If qrToken, look up the vendedor
        let vendedorId: string | undefined;
        if (dto.qrToken) {
          const qr = await tx.qrCode.findFirst({ where: { codigo: dto.qrToken, activo: true, expires_at: { gt: new Date() } } });
          if (qr) vendedorId = qr.vendedor_id;
        }
        if (!vendedorId) throw new UnauthorizedException('Invalid or expired QR token');

        await tx.cliente.create({
          data: {
            auth_user_id: user.id,
            nombre: dto.nombre,
            vendedor_id: vendedorId,
          },
        });
      } else if (dto.role === UserRole.vendedor) {
        await tx.vendedor.create({
          data: {
            auth_user_id: user.id,
            nombre: dto.nombre,
            estado: VendedorEstado.pendiente,
          },
        });
      }

      return user;
    });

    const tokens = await this.tokenService.generateTokens(result.id, result.email, result.role);

    await this.auditLogService.record(AuditAction.USER_REGISTERED, result.id);

    return {
      user: { id: result.id, email: result.email, role: result.role },
      ...tokens,
    };
  }

  async registerVendedor(dto: RegisterVendedorDto) {
    const existing = await this.prisma.authUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.authUser.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: UserRole.vendedor,
        },
      });

      const vendedor = await tx.vendedor.create({
        data: {
          auth_user_id: user.id,
          nombre: dto.nombre,
          telefono: dto.telefono,
          ciudad_default: dto.ciudad,
          zona_entrega: dto.zonaEntrega,
          estado: VendedorEstado.pendiente,
        },
      });

      return vendedor;
    });

    await this.auditLogService.record(AuditAction.USER_REGISTERED, result.auth_user_id);

    return {
      status: 'pendiente' as const,
      vendedorId: result.id,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.authUser.findUnique({ where: { email: dto.email } });
    if (!user) {
      // Timing-safe: always do bcrypt work even when user doesn't exist
      await bcrypt.hash('dummy', this.SALT_ROUNDS);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.is_active) throw new UnauthorizedException('Account is inactive');

    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.role);

    // Load nombre from profile
    let nombre: string | undefined;
    let apellido: string | undefined;
    if (user.role === UserRole.cliente) {
      const profile = await this.prisma.cliente.findUnique({ where: { auth_user_id: user.id } });
      nombre = profile?.nombre;
      apellido = profile?.apellido || undefined;
    } else if (user.role === UserRole.vendedor) {
      const profile = await this.prisma.vendedor.findUnique({ where: { auth_user_id: user.id } });
      nombre = profile?.nombre;
      apellido = profile?.apellido || undefined;
    }

    await this.auditLogService.record(AuditAction.USER_LOGIN, user.id);

    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role, nombre, apellido },
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    // For MVP, we don't track refresh tokens server-side
    const newToken = await this.tokenService.generateAccessToken(payload.sub, payload.email, payload.role);
    return { token: newToken };
  }

  async validate(token: string) {
    try {
      const payload = await this.tokenService.verifyToken(token);
      const user = await this.prisma.authUser.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, is_active: true },
      });
      if (!user || !user.is_active) return { valid: false, user: null };
      return { valid: true, user: { id: user.id, email: user.email, role: user.role } };
    } catch {
      return { valid: false, user: null };
    }
  }

  logout() {
    return { message: 'Logged out successfully' };
  }
}
