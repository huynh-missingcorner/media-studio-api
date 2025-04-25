import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import { ImageGenerationDto } from './dto/image-generation.dto';
import { VideoGenerationDto } from './dto/video-generation.dto';
import { MusicGenerationDto } from './dto/music-generation.dto';
import { AudioGenerationDto } from './dto/audio-generation.dto';
import { MediaResponseDto } from './dto/media-response.dto';
import { MediaHistoryQueryDto } from './dto/media-history-query.dto';
import { PaginatedResponse } from '../../shared/dto/pagination.dto';
import { User } from '@prisma/client';

@ApiTags('Media')
@Controller('media')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('image')
  @ApiOperation({ summary: 'Generate an image using Vertex AI Media Studio' })
  @ApiResponse({
    status: 201,
    description: 'Image generation request created',
    type: MediaResponseDto,
  })
  async generateImage(
    @CurrentUser() user: User,
    @Body() imageDto: ImageGenerationDto,
  ): Promise<MediaResponseDto> {
    return this.mediaService.generateImage(user.id, imageDto);
  }

  @Post('video/async')
  @ApiOperation({ summary: 'Generate a video asynchronously using Vertex AI Media Studio' })
  @ApiResponse({
    status: 201,
    description: 'Async video generation request initiated',
  })
  async generateVideoAsync(
    @CurrentUser() user: User,
    @Body() videoDto: VideoGenerationDto,
  ): Promise<{ operationId: string }> {
    const operationId = await this.mediaService.generateVideoAsync(user.id, videoDto);

    return { operationId };
  }

  @Get('video/status')
  @ApiOperation({ summary: 'Get the status of a video generation request' })
  @ApiResponse({
    status: 200,
    description: 'Video generation status retrieved',
  })
  async getVideoGenerationResults(
    @CurrentUser() user: User,
    @Query('operationId') operationId: string,
  ): Promise<MediaResponseDto> {
    return await this.mediaService.getVideoGenerationResults(user.id, operationId);
  }

  @Post('music')
  @ApiOperation({ summary: 'Generate music using Vertex AI Media Studio' })
  @ApiResponse({
    status: 201,
    description: 'Music generation request created',
    type: MediaResponseDto,
  })
  async generateMusic(
    @CurrentUser() user: User,
    @Body() musicDto: MusicGenerationDto,
  ): Promise<MediaResponseDto> {
    return this.mediaService.generateMusic(user.id, musicDto);
  }

  @Post('audio')
  @ApiOperation({ summary: 'Generate speech using Vertex AI Media Studio' })
  @ApiResponse({
    status: 201,
    description: 'Audio generation request created',
    type: MediaResponseDto,
  })
  async generateAudio(
    @CurrentUser() user: User,
    @Body() audioDto: AudioGenerationDto,
  ): Promise<MediaResponseDto> {
    return this.mediaService.generateAudio(user.id, audioDto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get history of media generation requests' })
  @ApiResponse({
    status: 200,
    description: 'Media generation history retrieved',
  })
  async getMediaHistory(
    @CurrentUser() user: User,
    @Query() query: MediaHistoryQueryDto,
  ): Promise<PaginatedResponse<MediaResponseDto>> {
    return this.mediaService.getMediaHistory(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a media generation request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Media generation request found',
    type: MediaResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Media generation request not found' })
  async getMediaRequestById(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<MediaResponseDto> {
    return this.mediaService.getMediaRequestById(id, user.id);
  }
}
