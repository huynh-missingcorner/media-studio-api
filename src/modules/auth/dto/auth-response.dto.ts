import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProfileDto } from 'src/modules/user/dto/profile.dto';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 900, // 15 minutes
  })
  expiresIn: number;

  @ApiProperty({
    description: 'User ID',
    example: '5f9d5b3b9d3f2c1b4c7f8b1a',
  })
  userId: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: 'USER',
  })
  role: UserRole;

  @ApiProperty({
    description: 'User profile',
    type: ProfileDto,
  })
  user: ProfileDto;
}
