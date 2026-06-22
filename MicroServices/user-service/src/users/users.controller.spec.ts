import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('users.profile', () => {
    it('should return profile stub for auth-service', async () => {
      const result = await controller.getProfile({ userId: 'stub-id' });
      expect(result).toHaveProperty('nombre', 'Juan');
      expect(result).toHaveProperty('apellido', 'Pérez');
      expect(result).toHaveProperty('id');
    });
  });

  describe('users.update', () => {
    it('should be defined and return not-yet-implemented', async () => {
      const result = await controller.updateProfile({});
      expect(result).toHaveProperty('message', 'Users service not yet implemented');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('users.cartera', () => {
    it('should be defined and return not-yet-implemented', async () => {
      const result = await controller.getCartera({});
      expect(result).toHaveProperty('message', 'Users service not yet implemented');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('users.qr', () => {
    it('should be defined and return not-yet-implemented', async () => {
      const result = await controller.getQR({});
      expect(result).toHaveProperty('message', 'Users service not yet implemented');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('users.link', () => {
    it('should be defined and return not-yet-implemented', async () => {
      const result = await controller.getLink({});
      expect(result).toHaveProperty('message', 'Users service not yet implemented');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('publico.vendedor', () => {
    it('should be defined and return not-yet-implemented', async () => {
      const result = await controller.getVendedorPublico({});
      expect(result).toHaveProperty('message', 'Public profile not yet implemented');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
