import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { ConflictException, ForbiddenException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
      inviteCode: 'VALID_CODE',
    };

    const newUser = {
      id: 'user-id',
      email: registerDto.email,
      passwordHash: 'hashed-password',
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: 'USER',
    };

    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'INVITE_CODE') return 'VALID_CODE';
        if (key === 'JWT_ACCESS_EXPIRATION') return '15m';
        if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
        if (key === 'JWT_SECRET') return 'jwt-secret';
        return null;
      });

      mockJwtService.signAsync.mockResolvedValue('jwt-token');
    });

    it('should throw ConflictException if user already exists', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-user-id' });

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
    });

    it('should throw ForbiddenException if invite code is invalid', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.register({ ...registerDto, inviteCode: 'INVALID_CODE' }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockConfigService.get).toHaveBeenCalledWith('INVITE_CODE');
    });

    it('should create a new user and return tokens if invite code is valid', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(newUser);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.userId).toBe(newUser.id);
    });
  });
});
