import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SeedService } from './seed.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

describe('SeedService', () => {
  let service: SeedService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should call seedAdminUser in development environment', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return null;
      });

      const seedAdminUserSpy = jest.spyOn(service, 'seedAdminUser').mockResolvedValue();

      await service.onModuleInit();

      expect(seedAdminUserSpy).toHaveBeenCalled();
    });

    it('should call seedAdminUser when ENABLE_SEEDING is true', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ENABLE_SEEDING') return 'true';
        return null;
      });

      const seedAdminUserSpy = jest.spyOn(service, 'seedAdminUser').mockResolvedValue();

      await service.onModuleInit();

      expect(seedAdminUserSpy).toHaveBeenCalled();
    });

    it('should not call seedAdminUser in production without ENABLE_SEEDING', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'ENABLE_SEEDING') return 'false';
        return null;
      });

      const seedAdminUserSpy = jest.spyOn(service, 'seedAdminUser').mockResolvedValue();

      await service.onModuleInit();

      expect(seedAdminUserSpy).not.toHaveBeenCalled();
    });
  });

  describe('seedAdminUser', () => {
    it('should create admin user if admin credentials are provided and user does not exist', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        switch (key) {
          case 'ADMIN_EMAIL':
            return 'admin@example.com';
          case 'ADMIN_PASSWORD':
            return 'password123';
          case 'ADMIN_FIRST_NAME':
            return defaultValue || 'Admin';
          case 'ADMIN_LAST_NAME':
            return defaultValue || 'User';
          default:
            return null;
        }
      });

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({ id: 1 });

      // Act
      await service.seedAdminUser();

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'admin@example.com',
          passwordHash: 'hashedPassword',
          firstName: 'Admin',
          lastName: 'User',
          role: UserRole.ADMIN,
        },
      });
    });

    it('should not create admin user if admin already exists', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'ADMIN_EMAIL':
            return 'admin@example.com';
          case 'ADMIN_PASSWORD':
            return 'password123';
          default:
            return null;
        }
      });

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1, email: 'admin@example.com' });

      // Act
      await service.seedAdminUser();

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
      });

      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should not create admin user if admin credentials are not provided', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'ADMIN_EMAIL':
            return null;
          case 'ADMIN_PASSWORD':
            return null;
          default:
            return null;
        }
      });

      // Act
      await service.seedAdminUser();

      // Assert
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should handle errors during admin user creation', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'ADMIN_EMAIL':
            return 'admin@example.com';
          case 'ADMIN_PASSWORD':
            return 'password123';
          default:
            return null;
        }
      });

      const error = new Error('Database error');
      mockPrismaService.user.findUnique.mockRejectedValue(error);

      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      // Act
      await service.seedAdminUser();

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to seed admin user', error);
    });
  });
});
