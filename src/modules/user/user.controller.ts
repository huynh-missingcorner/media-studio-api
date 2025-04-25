import { Controller, Get, Body, Patch, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProfileDto, UpdateProfileDto } from './dto/profile.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';

@ApiTags('User Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'The found user profile',
    type: ProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('profile')
  async getProfile(@CurrentUser() user: User): Promise<ProfileDto> {
    return this.userService.getProfile(user.id);
  }

  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'The updated user profile',
    type: ProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    return this.userService.updateProfile(user.id, updateProfileDto);
  }
}
