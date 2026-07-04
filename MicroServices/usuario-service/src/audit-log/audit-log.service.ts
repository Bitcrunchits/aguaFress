import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction } from '@agua/contracts';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuditLog } from '@prisma/client';

interface RecordOptions {
  targetId?: string;
  detail?: Record<string, unknown>;
  ip?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AuditLogWithActor {
  id: string;
  accion: string;
  usuario_id: string | null;
  target_id: string | null;
  detalle: unknown;
  ip: string | null;
  created_at: Date;
  actor: {
    email: string;
    role: string;
  } | null;
}

interface FindAllParams {
  page?: number;
  limit?: number;
  usuarioId?: string;
  accion?: string;
  targetId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    action: AuditAction,
    userId: string,
    opts?: RecordOptions,
  ): Promise<AuditLog> {
    if (!Object.values(AuditAction).includes(action)) {
      throw new BadRequestException(
        `Invalid audit action: ${action}. Must be a valid AuditAction enum value.`,
      );
    }

    return this.prisma.auditLog.create({
      data: {
        usuario_id: userId,
        accion: action,
        target_id: opts?.targetId ?? null,
        detalle: opts?.detail !== undefined ? (opts.detail as Prisma.InputJsonValue) : undefined,
        ip: opts?.ip ?? null,
      },
    });
  }

  async findAll(dto: FindAllParams): Promise<PaginatedResult<AuditLogEntry>> {
    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (dto.usuarioId) {
      where.usuario_id = dto.usuarioId;
    }

    if (dto.accion) {
      where.accion = dto.accion;
    }

    if (dto.targetId) {
      where.target_id = dto.targetId;
    }

    if (dto.from || dto.to) {
      const createdAt: Record<string, Date> = {};
      if (dto.from) {
        createdAt.gte = new Date(dto.from);
      }
      if (dto.to) {
        createdAt.lte = new Date(dto.to);
      }
      where.created_at = createdAt;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        where,
        orderBy: { created_at: 'desc' },
        include: {
          actor: {
            select: { email: true, role: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map(mapAuditLogEntry),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export interface AuditLogEntry {
  id: string;
  accion: string;
  usuarioId: string | null;
  usuarioEmail: string | null;
  usuarioRole: string | null;
  targetId: string | null;
  detalle: unknown;
  ip: string | null;
  createdAt: string;
}

function mapAuditLogEntry(row: AuditLogWithActor): AuditLogEntry {
  return {
    id: row.id,
    accion: row.accion,
    usuarioId: row.usuario_id,
    usuarioEmail: row.actor?.email ?? null,
    usuarioRole: row.actor?.role ?? null,
    targetId: row.target_id,
    detalle: row.detalle,
    ip: row.ip,
    createdAt: row.created_at.toISOString(),
  };
}
