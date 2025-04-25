import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ImageGenerationDto } from './dto/image-generation.dto';
import { VideoGenerationDto } from './dto/video-generation.dto';
import { MusicGenerationDto } from './dto/music-generation.dto';
import { AudioGenerationDto } from './dto/audio-generation.dto';
import { MediaResponseDto } from './dto/media-response.dto';
import { MediaHistoryQueryDto } from './dto/media-history-query.dto';
import { MediaType, RequestStatus, UserRole } from '@prisma/client';
import { PaginatedResponse } from '../../shared/dto/pagination.dto';
import {
  ImageAspectRatio,
  ImageGenerationModel,
  VideoAspectRatio,
  VideoGenerationModel,
} from './types/media.types';
import { MusicGenre } from './dto/music-generation.dto';

// Mock user for tests
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.USER,
  passwordHash: 'hashed-password',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock media response
const mockMediaResponse: MediaResponseDto = {
  id: 'test-media-id',
  prompt: 'test prompt',
  mediaType: MediaType.IMAGE,
  status: RequestStatus.SUCCEEDED,
  parameters: {},
  projectId: 'test-project-id',
  results: [
    {
      id: 'test-result-id',
      resultUrl: 'https://storage.googleapis.com/test-bucket/test-image.jpg',
      metadata: {
        mimeType: 'image/jpeg',
      },
      createdAt: new Date(),
    },
  ],
  createdAt: new Date(),
};

// Mock paginated response
const mockPaginatedResponse: PaginatedResponse<MediaResponseDto> = {
  data: [mockMediaResponse],
  meta: {
    totalItems: 1,
    itemCount: 1,
    itemsPerPage: 10,
    totalPages: 1,
    currentPage: 1,
  },
};

describe('MediaController', () => {
  let controller: MediaController;
  let service: MediaService;

  beforeEach(async () => {
    // Create a mock MediaService
    const mockMediaService = {
      generateImage: jest.fn().mockResolvedValue(mockMediaResponse),
      generateVideo: jest.fn().mockResolvedValue(mockMediaResponse),
      generateVideoAsync: jest.fn().mockResolvedValue('mock-operation-id-12345'),
      generateMusic: jest.fn().mockResolvedValue(mockMediaResponse),
      generateAudio: jest.fn().mockResolvedValue(mockMediaResponse),
      getMediaRequestById: jest.fn().mockResolvedValue(mockMediaResponse),
      getMediaHistory: jest.fn().mockResolvedValue(mockPaginatedResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
    service = module.get<MediaService>(MediaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateImage', () => {
    it('should call service.generateImage with correct parameters', async () => {
      // Arrange
      const imageDto: ImageGenerationDto = {
        projectId: 'test-project-id',
        prompt: 'A beautiful sunset',
        mediaType: MediaType.IMAGE,
        aspectRatio: ImageAspectRatio.ONE_TO_ONE,
        sampleCount: 1,
        model: ImageGenerationModel.IMAGEN_3,
      };

      // Act
      const result = await controller.generateImage(mockUser, imageDto);

      // Assert
      expect(service.generateImage).toHaveBeenCalledWith(mockUser.id, imageDto);
      expect(result).toEqual(mockMediaResponse);
    });
  });

  describe('generateVideoAsync', () => {
    it('should call service.generateVideoAsync with correct parameters', async () => {
      // Arrange
      const videoDto: VideoGenerationDto = {
        projectId: 'test-project-id',
        prompt: 'A drone shot of mountains',
        mediaType: MediaType.VIDEO,
        durationSeconds: 1,
        aspectRatio: VideoAspectRatio.SIXTEEN_TO_NINE,
        enhancePrompt: true,
        sampleCount: 1,
        model: VideoGenerationModel.VEO_2,
        seed: 42,
      };

      // Act
      const result = await controller.generateVideoAsync(mockUser, videoDto);

      // Assert
      expect(service.generateVideoAsync).toHaveBeenCalledWith(mockUser.id, videoDto);
      expect(result).toEqual({ operationId: 'mock-operation-id-12345' });
    });
  });

  describe('generateMusic', () => {
    it('should call service.generateMusic with correct parameters', async () => {
      // Arrange
      const musicDto: MusicGenerationDto = {
        projectId: 'test-project-id',
        prompt: 'An upbeat jazz melody',
        mediaType: MediaType.MUSIC,
        durationSeconds: 1,
        genre: MusicGenre.JAZZ,
        tempo: 0.5,
      };

      // Act
      const result = await controller.generateMusic(mockUser, musicDto);

      // Assert
      expect(service.generateMusic).toHaveBeenCalledWith(mockUser.id, musicDto);
      expect(result).toEqual(mockMediaResponse);
    });
  });

  describe('generateAudio', () => {
    it('should call service.generateAudio with correct parameters', async () => {
      // Arrange
      const audioDto: AudioGenerationDto = {
        projectId: 'test-project-id',
        prompt: 'Welcome to our application',
        mediaType: MediaType.AUDIO,
        durationSeconds: 1,
        audioStyle: 'NATURAL',
      };

      // Act
      const result = await controller.generateAudio(mockUser, audioDto);

      // Assert
      expect(service.generateAudio).toHaveBeenCalledWith(mockUser.id, audioDto);
      expect(result).toEqual(mockMediaResponse);
    });
  });

  describe('getMediaRequestById', () => {
    it('should call service.getMediaRequestById with correct parameters', async () => {
      // Arrange
      const mediaId = 'test-media-id';

      // Act
      const result = await controller.getMediaRequestById(mockUser, mediaId);

      // Assert
      expect(service.getMediaRequestById).toHaveBeenCalledWith(mediaId, mockUser.id);
      expect(result).toEqual(mockMediaResponse);
    });
  });

  describe('getMediaHistory', () => {
    it('should call service.getMediaHistory with correct parameters', async () => {
      // Arrange
      const queryDto: MediaHistoryQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        mediaType: MediaType.IMAGE,
      };

      // Act
      const result = await controller.getMediaHistory(mockUser, queryDto);

      // Assert
      expect(service.getMediaHistory).toHaveBeenCalledWith(mockUser.id, queryDto);
      expect(result).toEqual(mockPaginatedResponse);
    });
  });
});
