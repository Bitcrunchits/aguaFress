import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
      const data: any = {};
      if (dto.nombre !== undefined) data.nombre = dto.nombre;
      if (dto.apellido !== undefined) data.apellido = dto.apellido;
      if (dto.telefono !== undefined) data.telefono = dto.telefono;
      if (dto.tipoFactura !== undefined) data.tipo_factura = dto.tipoFactura;
      if (dto.address) {
        if (dto.address.calle !== undefined) data.direccion_calle = dto.address.calle;
        if (dto.address.numero !== undefined) data.direccion_numero = dto.address.numero;
        if (dto.address.pisoDepto !== undefined) data.direccion_piso = dto.address.pisoDepto;
        if (dto.address.referencia !== undefined) data.direccion_referencia = dto.address.referencia;
        if (dto.address.barrio !== undefined) data.direccion_barrio = dto.address.barrio;
        if (dto.address.ciudad !== undefined) data.direccion_ciudad = dto.address.ciudad;
        if (dto.address.provincia !== undefined) data.direccion_provincia = dto.address.provincia;
        if (dto.address.codigoPostal !== undefined) data.direccion_cp = dto.address.codigoPostal;
        if (dto.address.latitude !== undefined) data.latitud = dto.address.latitude;
        if (dto.address.longitude !== undefined) data.longitud = dto.address.longitude;
      }
      await this.prisma.cliente.update({
        where: { auth_user_id: userId },
        data,
      });
    } else if (user.role === UserRole.vendedor) {
      const data: any = {};
      if (dto.nombre !== undefined) data.nombre = dto.nombre;
      if (dto.apellido !== undefined) data.apellido = dto.apellido;
      if (dto.telefono !== undefined) data.telefono = dto.telefono;
      await this.prisma.vendedor.update({
        where: { auth_user_id: userId },
        data,
      });
    }

    return this.getProfile(userId);
  }
}
