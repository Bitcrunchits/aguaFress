import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, VendedorEstado } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateSuperAdminProfileDto } from './dto/update-super-admin.dto';
import { cleanUpdateInput } from '../common/utils/prisma.utils';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getProfile(userId: string) {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { auth_user_id: userId },
      include: {
        auth_user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Super admin profile not found');
    }

    return {
      id: admin.id,
      email: admin.auth_user.email,
      nombre: admin.nombre,
      apellido: admin.apellido,
      role: admin.auth_user.role,
    };
  }

  async updateProfile(userId: string, dto: UpdateSuperAdminProfileDto) {
    const existing = await this.prisma.superAdmin.findUnique({
      where: { auth_user_id: userId },
    });

    if (!existing) {
      throw new NotFoundException('Super admin profile not found');
    }

    const data = cleanUpdateInput(dto);

    if (Object.keys(data).length === 0) {
      return existing;
    }

    const result = await this.prisma.superAdmin.update({
      where: { auth_user_id: userId },
      data,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        created_at: true,
        updated_at: true,
      },
    });

    await this.auditLogService.record(AuditAction.SUPER_ADMIN_UPDATED, userId, {
      targetId: result.id,
    });

    return result;
  }

  async getDashboard() {
    const [
      totalVendedores,
      totalClientes,
      vendedoresActivos,
      vendedoresPendientes,
      clientesConVendedor,
      totalSuperAdmins,
    ] = await Promise.all([
      this.prisma.vendedor.count(),
      this.prisma.cliente.count(),
      this.prisma.vendedor.count({ where: { estado: VendedorEstado.ACTIVO } }),
      this.prisma.vendedor.count({ where: { estado: VendedorEstado.PENDIENTE } }),
      this.prisma.cartera.count({ where: { activo: true } }),
      this.prisma.superAdmin.count(),
    ]);

    return {
      totalVendedores,
      vendedoresActivos,
      vendedoresPendientes,
      totalClientes,
      clientesConVendedor,
      totalSuperAdmins,
    };
  }
}
