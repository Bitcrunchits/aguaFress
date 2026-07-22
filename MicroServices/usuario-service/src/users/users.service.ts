import { Injectable, NotFoundException } from '@nestjs/common';
import { $Enums, Prisma } from '../generated/prisma';
import { AuditAction, TipoFactura, UserRole, VendedorEstado } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { cleanUpdateInput } from '../common/utils/prisma.utils';
import { AuditLogService } from '../audit-log/audit-log.service';

export interface VendedorProfile {
  nombre: string;
  apellido: string;
  empresa: string | null;
  logo: string | null;
  estado: VendedorEstado;
  ciudadDefault: string;
  zonaEntrega: string | null;
}

export interface ClienteProfile {
  nombre: string;
  apellido: string;
  telefono: string;
  dni: string;
  tipoFactura: TipoFactura;
  direccionEntrega: ClienteDireccionEntregaProfile;
}

export interface ClienteDireccionEntregaProfile {
  calle: string;
  numero: string;
  pisoDepto: string | null;
  referencia: string | null;
  barrio: string | null;
  ciudad: string;
  provincia: string;
  codigoPostal: string | null;
}

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

const TIPO_FACTURA_TO_PRISMA: Record<TipoFactura, $Enums.TipoFactura> = {
  [TipoFactura.A]: $Enums.TipoFactura.A,
  [TipoFactura.B]: $Enums.TipoFactura.B,
  [TipoFactura.C]: $Enums.TipoFactura.C,
};

const VENDEDOR_ESTADO_FROM_PRISMA: Record<$Enums.VendedorEstado, VendedorEstado> = {
  [$Enums.VendedorEstado.pendiente]: VendedorEstado.PENDIENTE,
  [$Enums.VendedorEstado.activo]: VendedorEstado.ACTIVO,
  [$Enums.VendedorEstado.inactivo]: VendedorEstado.INACTIVO,
  [$Enums.VendedorEstado.bloqueado]: VendedorEstado.BLOQUEADO,
};

const TIPO_FACTURA_FROM_PRISMA: Record<$Enums.TipoFactura, TipoFactura> = {
  [$Enums.TipoFactura.A]: TipoFactura.A,
  [$Enums.TipoFactura.B]: TipoFactura.B,
  [$Enums.TipoFactura.C]: TipoFactura.C,
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

    let profile: VendedorProfile | ClienteProfile | undefined;

    if (user.vendedor) {
      profile = {
        nombre: user.vendedor.nombre,
        apellido: user.vendedor.apellido,
        empresa: user.vendedor.empresa,
        logo: user.vendedor.logo,
        estado: VENDEDOR_ESTADO_FROM_PRISMA[user.vendedor.estado],
        ciudadDefault: user.vendedor.ciudad_default,
        zonaEntrega: user.vendedor.zona_entrega,
      };
    } else if (user.cliente) {
      profile = {
        nombre: user.cliente.nombre,
        apellido: user.cliente.apellido,
        telefono: user.cliente.telefono,
        dni: user.cliente.dni,
        tipoFactura: TIPO_FACTURA_FROM_PRISMA[user.cliente.tipo_factura],
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
      telefono: profile && 'telefono' in profile ? profile.telefono : undefined,
      profile,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.authUser.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.CLIENTE) {
      const data: Prisma.ClienteUpdateInput = this.mapClienteProfileUpdate(dto);
      const { address } = dto;
      if (address) {
        Object.assign(data, cleanUpdateInput(address, ADDRESS_MAP));
      }
      await this.prisma.cliente.update({
        where: { auth_user_id: userId },
        data,
      });
    } else if (user.role === UserRole.VENDEDOR) {
      const data: Prisma.VendedorUpdateInput = this.mapVendedorProfileUpdate(dto);
      await this.prisma.vendedor.update({
        where: { auth_user_id: userId },
        data,
      });
    }

    await this.auditLogService.record(AuditAction.PROFILE_UPDATED, userId);

    return this.getProfile(userId);
  }

  private mapClienteProfileUpdate(dto: UpdateProfileDto): Prisma.ClienteUpdateInput {
    return cleanUpdateInput({
      nombre: dto.nombre,
      apellido: dto.apellido,
      telefono: dto.telefono,
      tipo_factura: dto.tipoFactura === undefined ? undefined : TIPO_FACTURA_TO_PRISMA[dto.tipoFactura],
    });
  }

  private mapVendedorProfileUpdate(dto: UpdateProfileDto): Prisma.VendedorUpdateInput {
    return cleanUpdateInput({
      nombre: dto.nombre,
      apellido: dto.apellido,
      telefono: dto.telefono,
    });
  }
}
