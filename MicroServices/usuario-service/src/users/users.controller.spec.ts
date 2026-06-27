import { Test, type TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const mockUsersService = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<typeof mockUsersService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  describe('GET /users/profile', () => {
    it('delega a UsersService.getProfile con userId del token', async () => {
      const expected = {
        id: 'user-1',
        email: 'test@test.com',
        role: 'cliente',
        isActive: true,
        nombre: 'Test',
        profile: { nombre: 'Test' },
      };
      mockUsersService.getProfile.mockResolvedValue(expected);

      const result = await controller.getProfile('user-1');

      expect(usersService.getProfile).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });

  describe('PATCH /users/profile', () => {
    it('delega a UsersService.updateProfile con userId y dto', async () => {
      const dto: UpdateProfileDto = { nombre: 'Updated' };
      const expected = {
        id: 'user-1',
        email: 'test@test.com',
        role: 'cliente',
        isActive: true,
        nombre: 'Updated',
        profile: { nombre: 'Updated' },
      };
      mockUsersService.updateProfile.mockResolvedValue(expected);

      const result = await controller.updateProfile('user-1', dto);

      expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(expected);
    });
  });
});
