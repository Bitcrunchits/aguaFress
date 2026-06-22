import {
  Injectable,
  Inject,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
} from '@agua/contracts';
import { UserRole } from '@agua/contracts';

const VALID_ROLES: UserRole[] = [UserRole.VENDEDOR, UserRole.CLIENTE];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  async register(dto: RegisterRequest): Promise<RegisterResponse> {
    // ── Validaciones ────────────────────────────────────────
    if (!dto.email?.trim()) {
      throw new BadRequestException('Email es requerido');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('Password debe tener al menos 6 caracteres');
    }
    if (!dto.nombre?.trim()) {
      throw new BadRequestException('Nombre es requerido');
    }
    if (!VALID_ROLES.includes(dto.role)) {
      throw new BadRequestException(
        `Role debe ser ${UserRole.VENDEDOR} o ${UserRole.CLIENTE}`,
      );
    }

    // ── Email único ─────────────────────────────────────────
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    // ── Hashear password y crear usuario ────────────────────
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
      },
    });

    // ── Notificar a user-service (async, fire-and-forget) ───
    this.userClient.emit('user.created', {
      type: 'UserCreated' as const,
      userId: user.id,
      email: user.email,
      role: dto.role,
      nombre: dto.nombre,
      qrToken: dto.qrToken,
      timestamp: new Date().toISOString(),
    });

    return {
      user: { id: user.id, email: user.email, role: dto.role },
    };
  }

  async login(dto: any): Promise<any> {
    // TODO: 1. buscar USER por email en DB
    //       2. bcrypt.compare(dto.password, user.password)
    //       3. generar JWT

    // Por ahora, stub que consulta a user-service para demostrar el flujo TCP
    try {
      const profile = await firstValueFrom(
        this.userClient.send('users.profile', { userId: 'stub-user-id' }).pipe(timeout(5000)),
      );

      return {
        token: 'jwt-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'stub-user-id',
          email: dto.email,
          role: 'cliente',
          nombre: profile?.nombre || 'Usuario',
          apellido: profile?.apellido || '',
        },
      };
    } catch (err) {
      // Si user-service no responde, igual devolvemos lo que tenemos
      return {
        token: 'jwt-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'stub-user-id',
          email: dto.email,
          role: 'cliente',
        },
      };
    }
  }

  async refresh(dto: any): Promise<any> {
    return { message: 'Auth refresh not yet implemented', timestamp: new Date().toISOString() };
  }

  async logout(dto: any): Promise<any> {
    return { message: 'Auth logout not yet implemented', timestamp: new Date().toISOString() };
  }
}
