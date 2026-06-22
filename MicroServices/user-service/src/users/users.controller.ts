import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class UsersController {
  @MessagePattern('users.profile')
  async getProfile(@Payload() data: any) {
    // Stub: auth-service consulta acá para completar LoginResponse
    // TODO: buscar en DB VENDEDOR o CLIENTE por auth_user_id
    return {
      id: data?.userId || 'stub-id',
      nombre: 'Juan',
      apellido: 'Pérez',
      role: 'cliente',
      telefono: '351-1234567',
    };
  }

  @MessagePattern('users.update')
  async updateProfile(@Payload() data: any) {
    return { message: 'Users service not yet implemented', timestamp: new Date().toISOString() };
  }

  @MessagePattern('users.cartera')
  async getCartera(@Payload() data: any) {
    return { message: 'Users service not yet implemented', timestamp: new Date().toISOString() };
  }

  @MessagePattern('users.qr')
  async getQR(@Payload() data: any) {
    return { message: 'Users service not yet implemented', timestamp: new Date().toISOString() };
  }

  @MessagePattern('users.link')
  async getLink(@Payload() data: any) {
    return { message: 'Users service not yet implemented', timestamp: new Date().toISOString() };
  }

  @MessagePattern('publico.vendedor')
  async getVendedorPublico(@Payload() data: any) {
    return { message: 'Public profile not yet implemented', timestamp: new Date().toISOString() };
  }
}
