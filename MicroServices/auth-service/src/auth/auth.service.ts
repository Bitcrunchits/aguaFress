import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(@Inject('USER_SERVICE') private readonly userClient: ClientProxy) {}

  async register(dto: any): Promise<any> {
    // TODO: implement register with bcrypt.hash
    // Emit UserCreatedEvent con nombre para que user-service cree el perfil
    return { message: 'Auth register not yet implemented', timestamp: new Date().toISOString() };
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
