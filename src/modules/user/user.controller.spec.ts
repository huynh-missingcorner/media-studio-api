import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ProfileDto, UpdateProfileDto } from './dto/profile.dto';
import { User, UserRole } from '@prisma/client';

describe('UserController', () => {
  let controller: UserController;

  const mockProfileDto: ProfileDto = {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockUserService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: 'hashedPassword',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return the user profile', async () => {
      mockUserService.getProfile.mockResolvedValue(mockProfileDto);

      const result = await controller.getProfile(mockUser);

      expect(result).toEqual(mockProfileDto);
      expect(mockUserService.getProfile).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('updateProfile', () => {
    it('should update and return the user profile', async () => {
      const updateDto: UpdateProfileDto = { firstName: 'Updated' };
      const updatedProfile = { ...mockProfileDto, firstName: 'Updated' };

      mockUserService.updateProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateProfile(mockUser, updateDto);

      expect(result).toEqual(updatedProfile);
      expect(mockUserService.updateProfile).toHaveBeenCalledWith(mockUser.id, updateDto);
    });
  });
});
