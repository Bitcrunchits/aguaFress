import * as crypto from 'crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TokenService } from './token.service';
import * as bcrypt from 'bcrypt';
import { UserRole, VendedorEstado, AuditAction } from '@agua/contracts';
import { RegisterDto } from './dto/register.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminGenerateResetTokenDto } from './dto/admin-generate-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async register(dto: RegisterDto) {
    if (dto.email !== dto.emailConfirmation) {
      throw new BadRequestException('El email de confirmación no coincide');
    }

    const existing = await this.prisma.authUser.findUnique({ where: { email: dto.email } });
    if (existing) {
      // Prevent email enumeration: do work regardless, return 201
      await bcrypt.hash(dto.password, this.SALT_ROUNDS);
      return { status: 'pendiente' as const, vendedorId: '' };
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
          telefono: dto.telefono,
          ciudad_default: dto.ciudad,
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

  // ─── Client Registration ───────────────────────────────────────

  async registerViaLink(dto: RegisterClientDto) {
    if (!dto.token) {
      throw new BadRequestException('Token de invitación requerido');
    }

    // Validate link token
    const link = await this.prisma.linkInvitacion.findUnique({
      where: { token: dto.token },
      select: { id: true, activo: true, expires_at: true, vendedor_id: true },
    });

    if (!link) {
      throw new NotFoundException('Token de invitación inválido');
    }

    if (!link.activo) {
      throw new BadRequestException('El link de invitación ya fue utilizado');
    }

    if (link.expires_at < new Date()) {
      throw new BadRequestException('El link de invitación expiró');
    }

    return this.createClienteUser(dto, link.vendedor_id, AuditAction.CLIENTE_REGISTERED, link.id);
  }

  async registerByVendor(dto: RegisterClientDto, authUserId: string) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { auth_user_id: authUserId },
      select: { id: true },
    });

    if (!vendedor) {
      throw new NotFoundException('Perfil de vendedor no encontrado');
    }

    return this.createClienteUser(dto, vendedor.id, AuditAction.CLIENTE_CREATED_BY_VENDOR);
  }

  private async createClienteUser(
    dto: RegisterClientDto,
    vendedorId: string,
    auditAction: AuditAction,
    linkId?: string,
  ) {
    if (dto.email !== dto.emailConfirmation) {
      throw new BadRequestException('El email de confirmación no coincide');
    }

    const existing = await this.prisma.authUser.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.authUser.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: UserRole.CLIENTE,
        },
      });

      const dir = dto.direccionEntrega;

      const cliente = await tx.cliente.create({
        data: {
          auth_user_id: user.id,
          nombre: dto.nombre,
          apellido: dto.apellido ?? '',
          telefono: dto.telefono ?? '',
          dni: dto.dni ?? '',
          vendedor_id: vendedorId,
          // Dirección fiscal = dirección de entrega (misma_direccion_entrega = true por defecto)
          direccion_calle: dir.calle,
          direccion_numero: dir.numero,
          direccion_piso: dir.pisoDepto,
          direccion_referencia: dir.referencia,
          direccion_barrio: dir.barrio,
          direccion_ciudad: dir.ciudad ?? '',
          direccion_provincia: dir.provincia ?? '',
          direccion_cp: dir.codigoPostal,
          latitud: dir.latitude,
          longitud: dir.longitude,
        },
      });

      // Crear RELACION_CARTERA activa
      await tx.cartera.create({
        data: {
          vendedor_id: vendedorId,
          cliente_id: cliente.id,
        },
      });

      // Desactivar link de invitación si se usó uno
      if (linkId) {
        await tx.linkInvitacion.update({
          where: { id: linkId },
          data: { activo: false },
        });
      }

      return { userId: user.id, clienteId: cliente.id };
    });

    // Generar JWT
    const tokens = await this.tokenService.generateTokens(
      result.userId,
      dto.email,
      UserRole.CLIENTE,
    );

    if (tokens.refreshToken) {
      const hash = this.hashToken(tokens.refreshToken);
      await this.prisma.authUser.update({
        where: { id: result.userId },
        data: { refresh_token_hash: hash },
      });
    }

    await this.auditLogService.record(auditAction, result.userId, {
      targetId: result.clienteId,
      detail: linkId ? { linkId } : undefined,
    });

    return {
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      clienteId: result.clienteId,
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

    // VENDEDOR debe tener estado "activo" para loguearse
    if (user.role === UserRole.VENDEDOR) {
      const vendedor = await this.prisma.vendedor.findUnique({
        where: { auth_user_id: user.id },
        select: { estado: true },
      });
      if (!vendedor || vendedor.estado !== 'activo') {
        throw new UnauthorizedException('Vendor account is not active');
      }
    }

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

    // VENDEDOR debe tener estado "activo" para renovar token
    if (user.role === UserRole.VENDEDOR) {
      const vendedor = await this.prisma.vendedor.findUnique({
        where: { auth_user_id: user.id },
        select: { estado: true },
      });
      if (!vendedor || vendedor.estado !== 'activo') {
        throw new UnauthorizedException('Vendor account is not active');
      }
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

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.authUser.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, this.SALT_ROUNDS);

    await this.prisma.authUser.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        // Invalidate all refresh tokens on password change
        refresh_token_hash: null,
      },
    });

    await this.auditLogService.record(AuditAction.PASSWORD_CHANGED, userId);

    return { message: 'Password changed successfully' };
  }

  /**
   * SUPER_ADMIN generates a one-time reset token for a target user.
   * Returns the raw token (only shown once) — the admin shares it with the user.
   */
  async adminGenerateResetToken(adminUserId: string, dto: AdminGenerateResetTokenDto) {
    const user = await this.prisma.authUser.findUnique({
      where: { id: dto.userId },
      select: { id: true, email: true },
    });

    if (!user) throw new NotFoundException('User not found');

    // Generate a random token and hash it for storage
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    // Token expires in 30 minutes
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.authUser.update({
      where: { id: dto.userId },
      data: {
        reset_token_hash: tokenHash,
        reset_token_expires: expiresAt,
      },
    });

    await this.auditLogService.record(
      AuditAction.PASSWORD_RESET_INITIATED,
      adminUserId,
      { targetId: dto.userId },
    );

    return {
      resetToken: rawToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Search for user with a matching reset token
    // We need to check all users that have a non-null reset_token_hash
    // and an unexpired reset_token_expires
    const users = await this.prisma.authUser.findMany({
      where: {
        reset_token_hash: { not: null },
        reset_token_expires: { gt: new Date() },
      },
      select: { id: true, reset_token_hash: true, reset_token_expires: true },
    });

    // Find the user whose hashed token matches
    const tokenHash = this.hashToken(dto.token);
    const match = users.find(u => u.reset_token_hash === tokenHash);

    if (!match) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, this.SALT_ROUNDS);

    await this.prisma.authUser.update({
      where: { id: match.id },
      data: {
        password: hashedPassword,
        // Clear reset token (one-time use) and invalidate refresh tokens
        reset_token_hash: null,
        reset_token_expires: null,
        refresh_token_hash: null,
      },
    });

    await this.auditLogService.record(AuditAction.PASSWORD_RESET_COMPLETED, match.id);

    return { message: 'Password reset successfully' };
  }

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
