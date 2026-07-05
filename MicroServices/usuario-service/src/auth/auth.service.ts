import * as crypto from 'crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TokenService } from './token.service';
import * as bcrypt from 'bcrypt';
import { UserRole, VendedorEstado, AuditAction, TipoFactura } from '@agua/contracts';
import { RegisterDto } from './dto/register.dto';
import { RegisterVendedorDto } from './dto/register-vendedor.dto';
import { LoginDto } from './dto/login.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private mapRoleToPrisma(role: UserRole): 'cliente' | 'vendedor' {
    if (role === UserRole.SUPER_ADMIN) throw new ForbiddenException('Cannot register as super admin');
    switch (role) {
      case UserRole.CLIENTE:
        return 'cliente';
      case UserRole.VENDEDOR:
        return 'vendedor';
      default:
        throw new BadRequestException('Invalid role');
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.authUser.findUnique({ where: { email: dto.email } });
    if (existing) {
      // Prevent email enumeration: do work regardless, return 201
      await bcrypt.hash(dto.password, this.SALT_ROUNDS);
      const fakeTokens = { token: '', refreshToken: '' };
      return {
        user: { id: '', email: dto.email, role: '' },
        ...fakeTokens,
      };
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.authUser.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: this.mapRoleToPrisma(dto.role),
        },
      });

      if (dto.role === UserRole.CLIENTE) {
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
            apellido: dto.apellido ?? '',
            dni: dto.dni ?? '',
            telefono: dto.telefono ?? '',
            tipo_factura: dto.tipoFactura ?? TipoFactura.B,
            direccion_calle: dto.direccionCalle ?? '',
            direccion_numero: dto.direccionNumero ?? '',
            direccion_ciudad: dto.direccionCiudad ?? '',
            direccion_provincia: dto.direccionProvincia ?? '',
            misma_direccion_entrega: dto.mismaDireccionEntrega ?? true,
            entrega_calle: dto.entregaCalle,
            entrega_numero: dto.entregaNumero,
            entrega_ciudad: dto.entregaCiudad,
            entrega_provincia: dto.entregaProvincia,
            vendedor_id: vendedorId,
          },
        });
      } else if (dto.role === UserRole.VENDEDOR) {
        await tx.vendedor.create({
          data: {
            auth_user_id: user.id,
            nombre: dto.nombre,
            estado: VendedorEstado.PENDIENTE,
          },
        });
      }

      return user;
    });

    const tokens = await this.tokenService.generateTokens(result.id, result.email, result.role);

    // Store refresh token hash for rotation
    if (tokens.refreshToken) {
      const hash = this.hashToken(tokens.refreshToken);
      await this.prisma.authUser.update({
        where: { id: result.id },
        data: { refresh_token_hash: hash },
      });
    }

    await this.auditLogService.record(AuditAction.USER_REGISTERED, result.id);

    return {
      user: { id: result.id, email: result.email, role: result.role },
      ...tokens,
    };
  }

  async registerVendedor(dto: RegisterVendedorDto) {
    const existing = await this.prisma.authUser.findUnique({ where: { email: dto.email } });
    if (existing) {
      // Prevent email enumeration: do work regardless, return 201
      await bcrypt.hash(dto.password, this.SALT_ROUNDS);
      return {
        status: 'pendiente' as const,
        vendedorId: '',
      };
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.authUser.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: UserRole.VENDEDOR,
        },
      });

      const vendedor = await tx.vendedor.create({
        data: {
          auth_user_id: user.id,
          nombre: dto.nombre,
          apellido: dto.apellido,
          dni: dto.dni,
          cuil: dto.cuil,
          cuit: dto.cuit,
          telefono: dto.telefono,
          ciudad_default: dto.ciudad,
          zona_entrega: dto.zonaEntrega,
          estado: VendedorEstado.PENDIENTE,
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

  // Constant dummy hash for timing-safe login — prevents timing-based user enumeration
  private readonly DUMMY_HASH = '$2b$12$LJ3m4ys3Lk5p0ys3Lk5p0uYHxqjJfHbv3X8a9zKQmRnD1o2p3q4rS';

  async login(dto: LoginDto) {
    const user = await this.prisma.authUser.findUnique({ where: { email: dto.email } });

    let isValid: boolean;
    if (!user) {
      // Timing-safe: use constant dummy hash instead of hashing 'dummy'
      isValid = await bcrypt.compare(dto.password, this.DUMMY_HASH);
    } else {
      isValid = await bcrypt.compare(dto.password, user.password);
    }

    if (!isValid || !user) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new UnauthorizedException('Account is inactive');

    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.role);

    // Store refresh token hash for rotation
    if (tokens.refreshToken) {
      const hash = this.hashToken(tokens.refreshToken);
      await this.prisma.authUser.update({
        where: { id: user.id },
        data: { refresh_token_hash: hash },
      });
    }

    // Load nombre from profile
    let nombre: string | undefined;
    let apellido: string | undefined;
    if (user.role === UserRole.CLIENTE) {
      const profile = await this.prisma.cliente.findUnique({ where: { auth_user_id: user.id } });
      nombre = profile?.nombre;
      apellido = profile?.apellido || undefined;
    } else if (user.role === UserRole.VENDEDOR) {
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

    // Refresh token rotation: verify hash before issuing new tokens
    const user = await this.prisma.authUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, refresh_token_hash: true, is_active: true },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    if (!user.refresh_token_hash || tokenHash !== user.refresh_token_hash) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.role);

    // Update stored hash for the new refresh token
    if (tokens.refreshToken) {
      const newHash = this.hashToken(tokens.refreshToken);
      await this.prisma.authUser.update({
        where: { id: user.id },
        data: { refresh_token_hash: newHash },
      });
    }

    return tokens;
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

  // TODO: Replace with Redis-backed blacklist for production
  private readonly tokenBlacklist = new Set<string>();

  async logout(userId?: string) {
    if (userId) {
      // Remove the refresh token hash — effectively revokes all refresh tokens
      await this.prisma.authUser.update({
        where: { id: userId },
        data: { refresh_token_hash: null },
      });
    }
    return { message: 'Logged out successfully' };
  }
}
