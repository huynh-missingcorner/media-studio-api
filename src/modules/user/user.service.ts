import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { ProfileDto, UpdateProfileDto } from './dto/profile.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get a user profile by id
   * @param userId - The user id
   * @returns The user profile data
   */
  async getProfile(userId: string): Promise<ProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update a user profile
   * @param userId - The user id
   * @param updateProfileDto - The data to update
   * @returns The updated user profile
   */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<ProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...updateProfileDto,
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    return updatedUser;
  }
}
