import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditAction } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole } from '@prisma/client';
import { cleanUpdateInput } from '../common/utils/prisma.utils';
import { AuditLogService } from '../audit-log/audit-log.service';

const ADDRESS_MAP: Partial<Record<keyof NonNullable<UpdateProfileDto['address']>, string>> = {
  calle: 'direccion_calle',
  numero: 'direccion_numero',
  pisoDepto: 'direccion_piso',
  referencia: 'direccion_referencia',
  barrio: 'direccion_barrio',
  ciudad: 'direccion_ciudad',
  provincia: 'direccion_provincia',
  codigoPostal: 'direccion_cp',
  latitude: 'latitud',
  longitude: 'longitud',
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.authUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        is_active: true,
        vendedor: {
          select: {
            nombre: true,
            apellido: true,
            empresa: true,
            logo: true,
            estado: true,
            qr_token: true,
            ciudad_default: true,
            zona_entrega: true,
          },
        },
        cliente: {
          select: {
            nombre: true,
            apellido: true,
            telefono: true,
            dni: true,
            tipo_factura: true,
            direccion_calle: true,
            direccion_numero: true,
            direccion_piso: true,
            direccion_referencia: true,
            direccion_barrio: true,
            direccion_ciudad: true,
            direccion_provincia: true,
            direccion_cp: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    let profile: Record<string, any> | undefined;

    if (user.vendedor) {
      profile = {
        nombre: user.vendedor.nombre,
        apellido: user.vendedor.apellido,
        empresa: user.vendedor.empresa,
        logo: user.vendedor.logo,
        estado: user.vendedor.estado,
        ciudadDefault: user.vendedor.ciudad_default,
        zonaEntrega: user.vendedor.zona_entrega,
      };
    } else if (user.cliente) {
      profile = {
        nombre: user.cliente.nombre,
        apellido: user.cliente.apellido,
        telefono: user.cliente.telefono,
        dni: user.cliente.dni,
        tipoFactura: user.cliente.tipo_factura,
        direccionEntrega: {
          calle: user.cliente.direccion_calle,
          numero: user.cliente.direccion_numero,
          pisoDepto: user.cliente.direccion_piso,
          referencia: user.cliente.direccion_referencia,
          barrio: user.cliente.direccion_barrio,
          ciudad: user.cliente.direccion_ciudad,
          provincia: user.cliente.direccion_provincia,
          codigoPostal: user.cliente.direccion_cp,
        },
      };
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      nombre: profile?.nombre,
      apellido: profile?.apellido,
      telefono: profile?.telefono,
      profile,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.authUser.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.cliente) {
      const { address, ...dtoFields } = dto;
      const data = cleanUpdateInput(dtoFields) as Prisma.ClienteUpdateInput;
      if (address) {
        Object.assign(data, cleanUpdateInput(address, ADDRESS_MAP));
      }
      await this.prisma.cliente.update({
        where: { auth_user_id: userId },
        data,
      });
    } else if (user.role === UserRole.vendedor) {
      const data = cleanUpdateInput(dto) as Prisma.VendedorUpdateInput;
      await this.prisma.vendedor.update({
        where: { auth_user_id: userId },
        data,
      });
    }

    await this.auditLogService.record(AuditAction.PROFILE_UPDATED, userId);

    return this.getProfile(userId);
  }
}
