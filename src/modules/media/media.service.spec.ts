import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { VertexAiService } from '../../shared/infrastructure/vertex-ai/vertex-ai.service';
import { HttpModule } from '@nestjs/axios';
import { MediaGeneration, MediaResult, MediaType, Project, RequestStatus } from '@prisma/client';
import { ImageGenerationDto } from './dto/image-generation.dto';
import { VertexAiApiError } from '../../shared/infrastructure/vertex-ai/vertex-ai.errors';
import { NotFoundException } from '@nestjs/common';
import { MediaHistoryQueryDto } from './dto/media-history-query.dto';
import { MediaService } from './media.service';
import { Prisma } from '@prisma/client';
import {
  ImageGenerationModel,
  ImageAspectRatio,
  VideoAspectRatio,
  VideoGenerationModel,
} from './types/media.types';
import { GoogleCloudService } from '../../shared/infrastructure/google-cloud/google-cloud.service';
import { VideoGenerationDto } from './dto/video-generation.dto';
import { MusicGenerationDto, MusicGenre } from './dto/music-generation.dto';
import { AudioGenerationDto } from './dto/audio-generation.dto';
import { MEDIA_GENERATION_QUEUE } from './queues/media-generation.queue';
import { getQueueToken } from '@nestjs/bull';

// Helper types for tests
type MediaParameters = Prisma.JsonObject;
type CreateMediaData = {
  userId: string;
  projectId: string;
  mediaType: MediaType;
  prompt: string;
  parameters: MediaParameters;
  status: RequestStatus;
};

type UpdateMediaData = {
  status: RequestStatus;
  errorMessage?: string;
};

type WhereCondition = {
  where: object;
  skip?: number;
  take?: number;
  orderBy?: object;
  include?: object;
};

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-1234'),
}));

describe('MediaService', () => {
  let service: MediaService;

  const mockPrismaService = {
    mediaGeneration: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    mediaResult: {
      create: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
  };

  const mockVertexAiService = {
    generateImage: jest.fn(),
    generateVideo: jest.fn(),
    generateMusic: jest.fn(),
    generateSpeech: jest.fn(),
    initiateVideoGeneration: jest.fn(),
    checkVideoGenerationStatus: jest.fn(),
    synthesizeAndStoreSpeech: jest.fn(),
  };

  const mockGoogleCloudService = {
    getAccessToken: jest.fn(),
    createSignedUrl: jest.fn(),
  };

  const mockMediaQueue = {
    add: jest.fn().mockImplementation(() => ({
      id: 'mocked-uuid-1234',
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: VertexAiService,
          useValue: mockVertexAiService,
        },
        {
          provide: GoogleCloudService,
          useValue: mockGoogleCloudService,
        },
        {
          provide: getQueueToken(MEDIA_GENERATION_QUEUE),
          useValue: mockMediaQueue,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);

    // Reset mocks between tests
    jest.clearAllMocks();

    // Default behavior for createSignedUrl
    mockGoogleCloudService.createSignedUrl.mockImplementation((gcsUri) => {
      return `https://signed-url.example.com/${gcsUri.split('/').pop()}`;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateImage', () => {
    const userId = 'user-id';
    const projectId = 'project-id';
    const imageDto: ImageGenerationDto = {
      projectId,
      prompt: 'A beautiful landscape',
      mediaType: MediaType.IMAGE,
      aspectRatio: ImageAspectRatio.ONE_TO_ONE,
      sampleCount: 1,
      model: ImageGenerationModel.IMAGEN_3,
    };

    const mockMediaParams: MediaParameters = {
      aspectRatio: ImageAspectRatio.ONE_TO_ONE,
      sampleCount: 1,
    };

    const mockMediaGeneration: Partial<MediaGeneration> = {
      id: 'media-id',
      userId,
      projectId,
      mediaType: MediaType.IMAGE,
      prompt: 'A beautiful landscape',
      parameters: mockMediaParams as any,
      status: RequestStatus.PENDING,
      createdAt: new Date(),
    };

    const mockMediaResult: Partial<MediaResult> = {
      id: 'result-id',
      mediaGenerationId: 'media-id',
      resultUrl: 'https://example.com/image.png',
      createdAt: new Date(),
    };

    const mockGenerationResult = {
      predictions: [
        {
          mimeType: 'image/png',
          gcsUri: 'gs://media-gen-bucket/sample_0.png',
          prompt: 'A beautiful landscape',
        },
        {
          mimeType: 'image/png',
          gcsUri: 'gs://media-gen-bucket/sample_1.png',
          prompt: 'A beautiful landscape',
        },
        {
          mimeType: 'image/png',
          gcsUri: 'gs://media-gen-bucket/sample_2.png',
          prompt: 'A beautiful landscape',
        },
        {
          mimeType: 'image/png',
          gcsUri: 'gs://media-gen-bucket/sample_3.png',
          prompt: 'A beautiful landscape',
        },
      ],
    };

    it('should validate the project exists', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.generateImage(userId, imageDto)).rejects.toThrow();
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });

    it('should create a media generation record with PENDING status', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );
      mockVertexAiService.generateImage.mockResolvedValue(mockGenerationResult);
      mockPrismaService.mediaResult.create.mockResolvedValue(mockMediaResult as MediaResult);
      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.SUCCEEDED,
        results: [mockMediaResult as MediaResult],
      } as MediaGeneration & { results: MediaResult[] });

      await service.generateImage(userId, imageDto);

      const expectedCreateData: CreateMediaData = {
        userId,
        projectId,
        mediaType: MediaType.IMAGE,
        prompt: imageDto.prompt,
        parameters: expect.any(Object),
        status: RequestStatus.PENDING,
      };

      expect(mockPrismaService.mediaGeneration.create).toHaveBeenCalledWith({
        data: expect.objectContaining(expectedCreateData),
      });
    });

    it('should call Vertex AI service with correct parameters', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );
      mockVertexAiService.generateImage.mockResolvedValue(mockGenerationResult);
      mockPrismaService.mediaResult.create.mockResolvedValue(mockMediaResult as MediaResult);
      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.SUCCEEDED,
        results: [mockMediaResult as MediaResult],
      } as MediaGeneration & { results: MediaResult[] });

      await service.generateImage(userId, imageDto);

      const expectedVertexParams = {
        prompt: imageDto.prompt,
        sampleCount: 1,
        aspectRatio: ImageAspectRatio.ONE_TO_ONE,
      };

      expect(mockVertexAiService.generateImage).toHaveBeenCalledWith(
        expect.objectContaining(expectedVertexParams),
      );
    });

    it('should create media results with original GCS URIs and return signed URLs', async () => {
      // Mock necessary services
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );

      // Mock Vertex AI response with GCS URIs
      mockVertexAiService.generateImage.mockResolvedValue(mockGenerationResult);

      // Mock media result creation
      mockPrismaService.mediaResult.create.mockImplementation(({ data }) => {
        return {
          id: `result-id-${Math.random().toString(36).substring(7)}`,
          mediaGenerationId: data.mediaGenerationId,
          resultUrl: data.resultUrl,
          metadata: data.metadata,
          createdAt: new Date(),
        } as MediaResult;
      });

      // Mock signed URL creation (but should only be used for response, not storage)
      mockGoogleCloudService.createSignedUrl.mockImplementation((gcsUri) => {
        const index = mockGenerationResult.predictions.findIndex((p) => p.gcsUri === gcsUri);
        return `https://signed-url.example.com/image_${index}.jpg`;
      });

      // Mock successful generation update
      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.SUCCEEDED,
        results: mockGenerationResult.predictions.map((prediction, index) => ({
          id: `result-id-${index}`,
          mediaGenerationId: 'media-id',
          resultUrl: prediction.gcsUri, // Store the original GCS URI
          metadata: {
            index,
            mimeType: 'image/png',
            prompt: 'A beautiful landscape',
          },
          createdAt: new Date(),
        })),
      } as MediaGeneration & { results: MediaResult[] });

      // Call the service method
      const result = await service.generateImage(userId, imageDto);

      // Verify media results were created with GCS URIs (not signed URLs)
      expect(mockPrismaService.mediaResult.create).toHaveBeenCalledTimes(
        mockGenerationResult.predictions.length,
      );

      // Verify the first call to create media result uses the GCS URI directly
      const firstCallData = mockPrismaService.mediaResult.create.mock.calls[0][0].data;
      expect(firstCallData.resultUrl).toContain('gs://');
      expect(firstCallData.resultUrl).not.toContain('signed-url.example.com');

      // Verify the response contains signed URLs
      expect(result.results.length).toBeGreaterThan(0);
      result.results.forEach((resultItem) => {
        expect(resultItem.resultUrl).toContain('signed-url.example.com');
        expect(resultItem.resultUrl).not.toContain('gs://');
      });
    });

    it('should store original GCS URIs in the database when creating media results', async () => {
      // Mock necessary services
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );

      // Mock Vertex AI response with GCS URIs
      mockVertexAiService.generateImage.mockResolvedValue({
        predictions: [
          {
            mimeType: 'image/png',
            gcsUri: 'gs://media-gen-bucket/sample_0.png',
            prompt: 'A beautiful landscape',
          },
        ],
      });

      // Mock media result creation to capture the data being saved
      let savedResultData:
        | { mediaGenerationId: string; resultUrl: string; metadata: any }
        | undefined;
      mockPrismaService.mediaResult.create.mockImplementation(({ data }) => {
        savedResultData = data;
        return {
          id: 'result-id-test',
          mediaGenerationId: data.mediaGenerationId,
          resultUrl: data.resultUrl,
          metadata: data.metadata,
          createdAt: new Date(),
        } as MediaResult;
      });

      // Mock successful generation update - don't include results to avoid triggering the getSignedUrlsForResults call
      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.SUCCEEDED,
        // Don't include results in the response
      } as MediaGeneration);

      // Reset mock calls before our test
      jest.clearAllMocks();

      // Call the service method
      await service.generateImage(userId, imageDto);

      // Verify the GCS URI was stored in the database
      expect(savedResultData).toBeDefined();
      if (savedResultData) {
        expect(savedResultData.resultUrl).toBe('gs://media-gen-bucket/sample_0.png');
        expect(savedResultData.resultUrl).toContain('gs://');
        expect(savedResultData.resultUrl).not.toContain('signed-url');
      }

      // Google Cloud Service should not be called when storing results
      expect(mockGoogleCloudService.createSignedUrl).not.toHaveBeenCalled();
    });

    it('should handle Vertex AI errors', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );

      const apiError = new VertexAiApiError('API Error', { response: { status: 400 } });
      mockVertexAiService.generateImage.mockRejectedValue(apiError);

      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.FAILED,
        errorMessage: 'API Error: Unknown error',
      } as MediaGeneration);

      await expect(service.generateImage(userId, imageDto)).rejects.toThrow();

      const expectedErrorData: UpdateMediaData = {
        status: RequestStatus.FAILED,
        errorMessage: 'API Error: Unknown error',
      };

      expect(mockPrismaService.mediaGeneration.update).toHaveBeenCalledWith({
        where: { id: mockMediaGeneration.id },
        data: expect.objectContaining(expectedErrorData),
      });
    });

    it('should create signed URLs for GCS URIs from Vertex AI', async () => {
      // Mock necessary services
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );

      // Mock Vertex AI response with GCS URIs
      mockVertexAiService.generateImage.mockResolvedValue(mockGenerationResult);

      // Mock media result creation
      mockPrismaService.mediaResult.create.mockImplementation(({ data }) => {
        return {
          id: `result-id-${Math.random().toString(36).substring(7)}`,
          mediaGenerationId: data.mediaGenerationId,
          resultUrl: data.resultUrl,
          metadata: data.metadata,
          createdAt: new Date(),
        } as MediaResult;
      });

      // Create an array of results that will be in the updated generation
      const resultsInDb = mockGenerationResult.predictions.map((prediction, index) => ({
        id: `result-id-${index}`,
        mediaGenerationId: 'media-id',
        resultUrl: prediction.gcsUri, // GCS URI as stored in DB
        metadata: {
          index,
          mimeType: 'image/png',
          prompt: 'A beautiful landscape',
        },
        createdAt: new Date(),
      }));

      // Mock successful generation update with results
      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.SUCCEEDED,
        results: resultsInDb,
      } as MediaGeneration & { results: MediaResult[] });

      // Mock signed URL creation
      mockGoogleCloudService.createSignedUrl.mockImplementation((gcsUri) => {
        const index = mockGenerationResult.predictions.findIndex((p) => p.gcsUri === gcsUri);
        return `https://signed-url.example.com/image_${index}.jpg`;
      });

      // Reset the mock before test
      jest.clearAllMocks();

      // Call the service method
      const result = await service.generateImage(userId, imageDto);

      // Verify Google Cloud Service was called to create signed URLs
      expect(mockGoogleCloudService.createSignedUrl).toHaveBeenCalledTimes(
        mockGenerationResult.predictions.length,
      );

      // Verify each GCS URI was converted to a signed URL
      mockGenerationResult.predictions.forEach((prediction) => {
        expect(mockGoogleCloudService.createSignedUrl).toHaveBeenCalledWith(prediction.gcsUri);
      });

      // Verify the returned URLs are signed URLs
      expect(result.results.length).toBe(mockGenerationResult.predictions.length);
      result.results.forEach((resultItem) => {
        expect(resultItem.resultUrl).toContain('signed-url.example.com');
        expect(resultItem.resultUrl).not.toContain('gs://');
      });
    });

    it('should handle error in signed URL generation gracefully', async () => {
      // Mock necessary services
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );

      // Mock Vertex AI response with GCS URIs
      mockVertexAiService.generateImage.mockResolvedValue(mockGenerationResult);

      // Mock error in signed URL creation only when called during response generation
      // First, mock media result creation to succeed (using GCS URI directly)
      let resultCreationCount = 0;
      mockPrismaService.mediaResult.create.mockImplementation(({ data }) => {
        resultCreationCount++;
        return {
          id: `result-id-${resultCreationCount}`,
          mediaGenerationId: data.mediaGenerationId,
          resultUrl: data.resultUrl,
          metadata: data.metadata,
          createdAt: new Date(),
        } as MediaResult;
      });

      // Mock successful database update with results (these will have GCS URIs)
      const resultsInDb = mockGenerationResult.predictions.map((prediction, index) => ({
        id: `result-id-${index + 1}`,
        mediaGenerationId: 'media-id',
        resultUrl: prediction.gcsUri,
        metadata: {
          index,
          mimeType: 'image/png',
          prompt: 'A beautiful landscape',
        },
        createdAt: new Date(),
      }));

      mockPrismaService.mediaGeneration.update.mockImplementation(({ data }) => {
        // If updating status to SUCCEEDED, return with results
        if (data.status === RequestStatus.SUCCEEDED) {
          return Promise.resolve({
            ...mockMediaGeneration,
            ...data,
            results: resultsInDb,
          } as MediaGeneration & { results: MediaResult[] });
        }
        // Otherwise just return basic data (for failure case)
        return Promise.resolve({
          ...mockMediaGeneration,
          ...data,
        } as MediaGeneration);
      });

      // Make signed URL generation fail when called during response processing
      mockGoogleCloudService.createSignedUrl.mockRejectedValue(
        new Error('Failed to generate signed URL'),
      );

      // Reset mocks
      jest.clearAllMocks();

      // Call the service method and expect the error from the signed URL generation to propagate
      await expect(service.generateImage(userId, imageDto)).rejects.toThrow(
        'Failed to generate signed URL',
      );

      // Verify MediaResult objects were created with GCS URIs
      expect(mockPrismaService.mediaResult.create).toHaveBeenCalledTimes(
        mockGenerationResult.predictions.length,
      );

      // Verify the first call passes the raw GCS URI
      const firstCallData = mockPrismaService.mediaResult.create.mock.calls[0][0].data;
      expect(firstCallData.resultUrl).toContain('gs://');

      // Check that the error was handled and the generation was marked as failed
      expect(mockPrismaService.mediaGeneration.update).toHaveBeenCalledWith({
        where: { id: mockMediaGeneration.id },
        data: expect.objectContaining({
          status: RequestStatus.FAILED,
          errorMessage: expect.stringContaining('Failed to generate signed URL'),
        }),
      });
    });
  });

  describe('generateMusic', () => {
    const userId = 'user-id';
    const projectId = 'project-id';
    const musicDto: MusicGenerationDto = {
      projectId,
      prompt: 'A relaxing piano melody',
      mediaType: MediaType.MUSIC,
      durationSeconds: 1,
      genre: MusicGenre.CLASSICAL,
      instrument: 'piano',
      tempo: 80,
      seed: 54321,
    };

    const mockMediaParams: MediaParameters = {
      durationSeconds: 1,
      genre: MusicGenre.CLASSICAL,
      instrument: 'piano',
      tempo: 80,
      seed: 54321,
    };

    const mockMediaGeneration: Partial<MediaGeneration> = {
      id: 'media-id',
      userId,
      projectId,
      mediaType: MediaType.MUSIC,
      prompt: 'A relaxing piano melody',
      parameters: mockMediaParams as any,
      status: RequestStatus.PENDING,
      createdAt: new Date(),
    };

    const mockMediaResult: Partial<MediaResult> = {
      id: 'result-id',
      mediaGenerationId: 'media-id',
      resultUrl: 'gs://media-gen-bucket/music.mp3',
      createdAt: new Date(),
    };

    const mockGenerationResult = {
      predictions: [
        {
          mimeType: 'audio/mp3',
          gcsUri: 'gs://media-gen-bucket/music.mp3',
          prompt: 'A relaxing piano melody',
        },
      ],
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should validate the project exists', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.generateMusic(userId, musicDto)).rejects.toThrow();
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });

    it('should create a media generation record with PENDING status', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );
      mockVertexAiService.generateMusic.mockResolvedValue(mockGenerationResult);
      mockPrismaService.mediaResult.create.mockResolvedValue(mockMediaResult as MediaResult);
      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.SUCCEEDED,
        results: [mockMediaResult as MediaResult],
      } as MediaGeneration & { results: MediaResult[] });

      await service.generateMusic(userId, musicDto);

      const expectedCreateData: CreateMediaData = {
        userId,
        projectId,
        mediaType: MediaType.MUSIC,
        prompt: musicDto.prompt,
        parameters: expect.any(Object),
        status: RequestStatus.PENDING,
      };

      expect(mockPrismaService.mediaGeneration.create).toHaveBeenCalledWith({
        data: expect.objectContaining(expectedCreateData),
      });
    });

    it('should call Vertex AI service with correct parameters', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );
      mockVertexAiService.generateMusic.mockResolvedValue(mockGenerationResult);
      mockPrismaService.mediaResult.create.mockResolvedValue(mockMediaResult as MediaResult);
      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.SUCCEEDED,
        results: [mockMediaResult as MediaResult],
      } as MediaGeneration & { results: MediaResult[] });
      mockGoogleCloudService.createSignedUrl.mockResolvedValue(
        'https://signed-url.example.com/music.mp3',
      );

      await service.generateMusic(userId, musicDto);

      const expectedVertexParams = {
        prompt: musicDto.prompt,
        sampleCount: 1,
        duration: musicDto.durationSeconds,
      };

      expect(mockVertexAiService.generateMusic).toHaveBeenCalledWith(
        expect.objectContaining(expectedVertexParams),
      );
    });

    it('should store original GCS URIs in the database when creating media results', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );
      mockVertexAiService.generateMusic.mockResolvedValue(mockGenerationResult);

      let savedResultData:
        | { mediaGenerationId: string; resultUrl: string; metadata: any }
        | undefined;
      mockPrismaService.mediaResult.create.mockImplementation(({ data }) => {
        savedResultData = data;
        return {
          id: 'result-id-test',
          mediaGenerationId: data.mediaGenerationId,
          resultUrl: data.resultUrl,
          metadata: data.metadata,
          createdAt: new Date(),
        } as MediaResult;
      });

      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.SUCCEEDED,
      } as MediaGeneration);

      await service.generateMusic(userId, musicDto);

      expect(savedResultData).toBeDefined();
      if (savedResultData) {
        expect(savedResultData.resultUrl).toBe('gs://media-gen-bucket/music.mp3');
        expect(savedResultData.resultUrl).toContain('gs://');
        expect(savedResultData.resultUrl).not.toContain('signed-url');
        expect(savedResultData.metadata).toMatchObject({
          mimeType: 'audio/mp3',
          prompt: 'A relaxing piano melody',
          durationSeconds: 1,
          genre: MusicGenre.CLASSICAL,
        });
      }

      expect(mockGoogleCloudService.createSignedUrl).not.toHaveBeenCalled();
    });

    it('should handle Vertex AI errors', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );

      const apiError = new VertexAiApiError('API Error', { response: { status: 400 } });
      mockVertexAiService.generateMusic.mockRejectedValue(apiError);

      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.FAILED,
        errorMessage: 'API Error: Unknown error',
      } as MediaGeneration);

      await expect(service.generateMusic(userId, musicDto)).rejects.toThrow();

      const expectedErrorData: UpdateMediaData = {
        status: RequestStatus.FAILED,
        errorMessage: 'API Error: Unknown error',
      };

      expect(mockPrismaService.mediaGeneration.update).toHaveBeenCalledWith({
        where: { id: mockMediaGeneration.id },
        data: expect.objectContaining(expectedErrorData),
      });
    });
  });

  describe('generateAudio', () => {
    const userId = 'user-id';
    const projectId = 'project-id';
    const audioDto: AudioGenerationDto = {
      projectId,
      prompt: 'Welcome to our audio guide',
      mediaType: MediaType.AUDIO,
      durationSeconds: 1,
      audioStyle: 'en-US-Standard-A',
      seed: 98765,
    };

    const mockMediaParams: MediaParameters = {
      durationSeconds: 1,
      audioStyle: 'en-US-Standard-A',
      seed: 98765,
    };

    const mockMediaGeneration: Partial<MediaGeneration> = {
      id: 'media-id',
      userId,
      projectId,
      mediaType: MediaType.AUDIO,
      prompt: 'Welcome to our audio guide',
      parameters: mockMediaParams as any,
      status: RequestStatus.PENDING,
      createdAt: new Date(),
    };

    const mockMediaResult: Partial<MediaResult> = {
      id: 'result-id',
      mediaGenerationId: 'media-id',
      resultUrl: 'gs://media-gen-bucket/speech.mp3',
      createdAt: new Date(),
    };

    const mockStoredSpeechResponse = {
      audioUrl: 'https://storage.googleapis.com/media-gen-bucket/speech.mp3',
      filePath: 'audio/speech.mp3',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should validate the project exists', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.generateAudio(userId, audioDto)).rejects.toThrow();
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });

    it('should create a media generation record with PENDING status', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );
      mockVertexAiService.synthesizeAndStoreSpeech.mockResolvedValue(mockStoredSpeechResponse);
      mockPrismaService.mediaResult.create.mockResolvedValue(mockMediaResult as MediaResult);
      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.SUCCEEDED,
        results: [mockMediaResult as MediaResult],
      } as MediaGeneration & { results: MediaResult[] });

      await service.generateAudio(userId, audioDto);

      const expectedCreateData: CreateMediaData = {
        userId,
        projectId,
        mediaType: MediaType.AUDIO,
        prompt: audioDto.prompt,
        parameters: expect.any(Object),
        status: RequestStatus.PENDING,
      };

      expect(mockPrismaService.mediaGeneration.create).toHaveBeenCalledWith({
        data: expect.objectContaining(expectedCreateData),
      });
    });

    it('should call Vertex AI service with correct parameters', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );
      mockVertexAiService.synthesizeAndStoreSpeech.mockResolvedValue(mockStoredSpeechResponse);
      mockPrismaService.mediaResult.create.mockResolvedValue(mockMediaResult as MediaResult);
      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.SUCCEEDED,
        results: [mockMediaResult as MediaResult],
      } as MediaGeneration & { results: MediaResult[] });
      mockGoogleCloudService.createSignedUrl.mockResolvedValue(
        'https://signed-url.example.com/speech.mp3',
      );

      await service.generateAudio(userId, audioDto);

      const expectedSpeechParams = {
        text: audioDto.prompt,
        voice: audioDto.audioStyle,
      };

      expect(mockVertexAiService.synthesizeAndStoreSpeech).toHaveBeenCalledWith(
        expect.objectContaining(expectedSpeechParams),
      );
    });

    it('should store the audio URL in the database when creating media results', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );
      mockVertexAiService.synthesizeAndStoreSpeech.mockResolvedValue(mockStoredSpeechResponse);

      let savedResultData:
        | { mediaGenerationId: string; resultUrl: string; metadata: any }
        | undefined;
      mockPrismaService.mediaResult.create.mockImplementation(({ data }) => {
        savedResultData = data;
        return {
          id: 'result-id-test',
          mediaGenerationId: data.mediaGenerationId,
          resultUrl: data.resultUrl,
          metadata: data.metadata,
          createdAt: new Date(),
        } as MediaResult;
      });

      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.SUCCEEDED,
      } as MediaGeneration);

      await service.generateAudio(userId, audioDto);

      expect(savedResultData).toBeDefined();
      if (savedResultData) {
        expect(savedResultData.resultUrl).toBe(mockStoredSpeechResponse.audioUrl);
        expect(savedResultData.metadata).toMatchObject({
          mimeType: 'audio/mp3',
          prompt: 'Welcome to our audio guide',
          durationSeconds: 1,
          voice: 'en-US-Standard-A',
          filePath: mockStoredSpeechResponse.filePath,
        });
      }
    });

    it('should handle Vertex AI errors', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);
      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );

      const apiError = new VertexAiApiError('API Error', { response: { status: 400 } });
      mockVertexAiService.synthesizeAndStoreSpeech.mockRejectedValue(apiError);

      mockPrismaService.mediaGeneration.update.mockResolvedValue({
        ...mockMediaGeneration,
        status: RequestStatus.FAILED,
        errorMessage: 'API Error: Unknown error',
      } as MediaGeneration);

      await expect(service.generateAudio(userId, audioDto)).rejects.toThrow();

      const expectedErrorData: UpdateMediaData = {
        status: RequestStatus.FAILED,
        errorMessage: 'API Error: Unknown error',
      };

      expect(mockPrismaService.mediaGeneration.update).toHaveBeenCalledWith({
        where: { id: mockMediaGeneration.id },
        data: expect.objectContaining(expectedErrorData),
      });
    });
  });

  describe('getMediaRequestById', () => {
    const userId = 'user-id';
    const mediaId = 'media-id';

    it('should return the media request if it exists and belongs to the user', async () => {
      const mockMediaParams: MediaParameters = {
        width: 512,
        height: 512,
      };

      const mockMediaResult: Partial<MediaResult> = {
        id: 'result-id',
        mediaGenerationId: mediaId,
        resultUrl: 'https://example.com/image.png',
        createdAt: new Date(),
      };

      const mockMediaGeneration: Partial<MediaGeneration> & { results: Partial<MediaResult>[] } = {
        id: mediaId,
        userId,
        projectId: 'project-id',
        mediaType: MediaType.IMAGE,
        prompt: 'A test prompt',
        parameters: mockMediaParams as any,
        status: RequestStatus.SUCCEEDED,
        results: [mockMediaResult],
        createdAt: new Date(),
      };

      mockPrismaService.mediaGeneration.findUnique.mockResolvedValue(
        mockMediaGeneration as MediaGeneration & { results: MediaResult[] },
      );

      const result = await service.getMediaRequestById(mediaId, userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mediaId);
      expect(mockPrismaService.mediaGeneration.findUnique).toHaveBeenCalledWith({
        where: { id: mediaId, userId },
        include: { results: true },
      });
    });

    it('should throw NotFoundException if the media request does not exist', async () => {
      mockPrismaService.mediaGeneration.findUnique.mockResolvedValue(null);

      await expect(service.getMediaRequestById(mediaId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMediaHistory', () => {
    const userId = 'user-id';
    const mockHistoryDto = new MediaHistoryQueryDto();
    mockHistoryDto.page = 1;
    mockHistoryDto.limit = 10;
    mockHistoryDto.mediaType = MediaType.IMAGE;

    it('should return paginated media history', async () => {
      const emptyParams: MediaParameters = {};

      const mockMediaResult: Partial<MediaResult> = {
        id: 'result-id',
        mediaGenerationId: 'media-1',
        resultUrl: 'https://example.com/image.png',
        createdAt: new Date(),
      };

      const mockMediaGenerations: (Partial<MediaGeneration> & {
        results: Partial<MediaResult>[];
      })[] = [
        {
          id: 'media-1',
          userId,
          projectId: 'project-id',
          mediaType: MediaType.IMAGE,
          prompt: 'Test 1',
          parameters: emptyParams as any,
          status: RequestStatus.SUCCEEDED,
          results: [mockMediaResult],
          createdAt: new Date(),
        },
        {
          id: 'media-2',
          userId,
          projectId: 'project-id',
          mediaType: MediaType.IMAGE,
          prompt: 'Test 2',
          parameters: emptyParams as any,
          status: RequestStatus.SUCCEEDED,
          results: [{ ...mockMediaResult, id: 'result-id-2', mediaGenerationId: 'media-2' }],
          createdAt: new Date(),
        },
      ];

      mockPrismaService.mediaGeneration.findMany.mockResolvedValue(
        mockMediaGenerations as (MediaGeneration & { results: MediaResult[] })[],
      );
      mockPrismaService.mediaGeneration.count.mockResolvedValue(10);

      const result = await service.getMediaHistory(userId, mockHistoryDto);

      expect(result.data).toHaveLength(2);
      expect(result.meta.totalItems).toBe(10);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.itemsPerPage).toBe(10);

      const expectedWhere: WhereCondition = {
        where: expect.objectContaining({
          userId,
          mediaType: MediaType.IMAGE,
        }),
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { results: true },
      };

      expect(mockPrismaService.mediaGeneration.findMany).toHaveBeenCalledWith(
        expect.objectContaining(expectedWhere),
      );
    });

    it('should apply search filter if provided', async () => {
      const searchDto = new MediaHistoryQueryDto();
      searchDto.page = 1;
      searchDto.limit = 10;
      searchDto.mediaType = MediaType.IMAGE;
      searchDto.search = 'landscape';

      mockPrismaService.mediaGeneration.findMany.mockResolvedValue([]);
      mockPrismaService.mediaGeneration.count.mockResolvedValue(0);

      await service.getMediaHistory(userId, searchDto);

      const expectedWhereWithSearch: WhereCondition = {
        where: expect.objectContaining({
          prompt: {
            contains: 'landscape',
            mode: 'insensitive',
          },
        }),
        include: { results: true },
      };

      expect(mockPrismaService.mediaGeneration.findMany).toHaveBeenCalledWith(
        expect.objectContaining(expectedWhereWithSearch),
      );
    });
  });

  describe('getSignedUrlsForResults', () => {
    it('should convert GCS URIs to signed URLs for response only', async () => {
      // Create MediaResults with GCS URIs (as they would be stored in the database)
      const mediaResults = [
        {
          id: 'result-1',
          mediaGenerationId: 'media-gen-1',
          resultUrl: 'gs://bucket-name/path/to/image1.jpg',
          metadata: {
            mimeType: 'image/jpeg',
          } as Prisma.JsonValue,
          createdAt: new Date(),
        },
        {
          id: 'result-2',
          mediaGenerationId: 'media-gen-1',
          resultUrl: 'gs://bucket-name/path/to/image2.jpg',
          metadata: {
            mimeType: 'image/jpeg',
          } as Prisma.JsonValue,
          createdAt: new Date(),
        },
      ] as MediaResult[];

      // Mock signed URL generation for responses
      mockGoogleCloudService.createSignedUrl.mockImplementation((gcsUri) => {
        const resultIndex = mediaResults.findIndex((r) => r.resultUrl === gcsUri);
        return `https://signed-url.example.com/image_${resultIndex + 1}.jpg`;
      });

      // Call the method
      const resultsWithSignedUrls = await service.getSignedUrlsForResults(mediaResults);

      // Verify Google Cloud Service was called to create signed URLs
      expect(mockGoogleCloudService.createSignedUrl).toHaveBeenCalledTimes(mediaResults.length);

      // Verify results contain signed URLs for response
      expect(resultsWithSignedUrls.length).toBe(mediaResults.length);
      resultsWithSignedUrls.forEach((result, index) => {
        expect(result.resultUrl).toBe(`https://signed-url.example.com/image_${index + 1}.jpg`);
        const metadata = result.metadata as Record<string, any>;
        // Original GCS URI should be preserved in the response
        expect(metadata.originalGcsUri).toBe(mediaResults[index].resultUrl);
      });

      // Verify the original MediaResult objects were not modified
      expect(mediaResults[0].resultUrl).toBe('gs://bucket-name/path/to/image1.jpg');
      expect(mediaResults[1].resultUrl).toBe('gs://bucket-name/path/to/image2.jpg');
    });

    it('should handle non-GCS URLs in results', async () => {
      // Create a mix of MediaResults with GCS URIs and already signed URLs
      const mediaResults = [
        {
          id: 'result-1',
          mediaGenerationId: 'media-gen-1',
          resultUrl: 'gs://bucket-name/path/to/image1.jpg',
          metadata: {
            mimeType: 'image/jpeg',
          } as Prisma.JsonValue,
          createdAt: new Date(),
        },
        {
          id: 'result-2',
          mediaGenerationId: 'media-gen-1',
          resultUrl: 'https://already-signed-url.example.com/image2.jpg',
          metadata: {
            originalGcsUri: 'gs://bucket-name/path/to/image2.jpg',
            mimeType: 'image/jpeg',
          } as Prisma.JsonValue,
          createdAt: new Date(),
        },
      ] as MediaResult[];

      // Mock signed URL generation for the first result only
      mockGoogleCloudService.createSignedUrl.mockResolvedValue(
        'https://signed-url.example.com/image1.jpg',
      );

      // Call the method
      const resultsWithSignedUrls = await service.getSignedUrlsForResults(mediaResults);

      // Verify Google Cloud Service was called only for GCS URIs
      expect(mockGoogleCloudService.createSignedUrl).toHaveBeenCalledTimes(1);
      expect(mockGoogleCloudService.createSignedUrl).toHaveBeenCalledWith(
        'gs://bucket-name/path/to/image1.jpg',
      );

      // Verify results
      expect(resultsWithSignedUrls.length).toBe(mediaResults.length);
      expect(resultsWithSignedUrls[0].resultUrl).toBe('https://signed-url.example.com/image1.jpg');
      expect(resultsWithSignedUrls[1].resultUrl).toBe(
        'https://already-signed-url.example.com/image2.jpg',
      );
    });

    it('should update result URLs when fetching a media generation by ID', async () => {
      // Mock a media generation with GCS URIs
      const mockMediaWithGcsUris = {
        id: 'media-id',
        userId: 'user-id',
        projectId: 'project-id',
        mediaType: MediaType.IMAGE,
        prompt: 'A beautiful landscape',
        parameters: {} as Prisma.JsonValue,
        status: RequestStatus.SUCCEEDED,
        results: [
          {
            id: 'result-1',
            mediaGenerationId: 'media-id',
            resultUrl: 'gs://bucket-name/path/to/image1.jpg',
            metadata: { mimeType: 'image/jpeg' } as Prisma.JsonValue,
            createdAt: new Date(),
          },
        ] as MediaResult[],
        createdAt: new Date(),
      } as MediaGeneration & { results: MediaResult[] };

      // Mock Prisma findUnique to return the media generation
      mockPrismaService.mediaGeneration.findUnique.mockResolvedValue(mockMediaWithGcsUris);

      // Mock signed URL generation
      mockGoogleCloudService.createSignedUrl.mockResolvedValue(
        'https://signed-url.example.com/image1.jpg',
      );

      // Call the service method
      const result = await service.getMediaRequestById('media-id', 'user-id');

      // Verify Google Cloud Service was called to create signed URL
      expect(mockGoogleCloudService.createSignedUrl).toHaveBeenCalledWith(
        'gs://bucket-name/path/to/image1.jpg',
      );

      // Verify the resultUrl is updated to the signed URL
      expect(result.results[0].resultUrl).toBe('https://signed-url.example.com/image1.jpg');
    });
  });

  describe('generateVideo', () => {
    const userId = 'user-id';
    const projectId = 'project-id';
    const videoDto: VideoGenerationDto = {
      projectId,
      prompt: 'A beautiful landscape video',
      mediaType: MediaType.VIDEO,
      aspectRatio: VideoAspectRatio.SIXTEEN_TO_NINE,
      durationSeconds: 1,
      model: VideoGenerationModel.VEO_2,
      enhancePrompt: true,
      sampleCount: 1,
      seed: 12345,
    };

    it('should queue a video generation job and return the job ID', async () => {
      // Call the service method
      const result = await service.generateVideoAsync(userId, videoDto);

      // Verify the job was added to the queue
      expect(mockMediaQueue.add).toHaveBeenCalledWith(
        'initiate-video-generation',
        expect.objectContaining({
          userId,
          projectId,
          prompt: videoDto.prompt,
          parameters: expect.objectContaining({
            durationSeconds: videoDto.durationSeconds,
            aspectRatio: videoDto.aspectRatio,
            enhancePrompt: videoDto.enhancePrompt,
          }),
        }),
      );

      // Verify the job ID is returned
      expect(result).toBe('mocked-uuid-1234');
    });
  });

  describe('initiateVideoGeneration', () => {
    const userId = 'user-id';
    const projectId = 'project-id';
    const prompt = 'A beautiful landscape video';
    const parameters = {
      durationSeconds: 1,
      aspectRatio: VideoAspectRatio.SIXTEEN_TO_NINE,
      enhancePrompt: true,
      sampleCount: 1,
      model: VideoGenerationModel.VEO_2,
      seed: 12345,
    };

    it('should validate the project exists', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      const operationId = 'operations/1234567890';

      await expect(
        service.initiateVideoGeneration(userId, projectId, prompt, parameters, operationId),
      ).rejects.toThrow();
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });

    it('should create a media generation record and call Vertex AI service', async () => {
      // Mock project exists
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);

      // Mock media generation creation
      const mockMediaGeneration = {
        id: 'media-id',
        userId,
        projectId,
        mediaType: MediaType.VIDEO,
        prompt,
        parameters: parameters as any,
        status: RequestStatus.PROCESSING,
        createdAt: new Date(),
      };

      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );

      // Mock Vertex AI response
      const operationName = 'operations/1234567890';
      const operationId = 'operations/1234567890';
      mockVertexAiService.initiateVideoGeneration.mockResolvedValue(operationName);

      // Call the service method
      const result = await service.initiateVideoGeneration(
        userId,
        projectId,
        prompt,
        parameters,
        operationId,
      );

      // Verify a media generation record was created
      expect(mockPrismaService.mediaGeneration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          projectId,
          mediaType: MediaType.VIDEO,
          prompt,
          parameters: expect.any(Object),
          status: RequestStatus.PROCESSING,
        }),
      });

      // Verify Vertex AI service was called
      expect(mockVertexAiService.initiateVideoGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt,
          sampleCount: parameters.sampleCount,
          durationSeconds: parameters.durationSeconds,
        }),
      );

      // Verify the operation name is returned
      expect(result).toBe(operationName);
    });

    it('should handle errors during video generation initiation', async () => {
      // Mock project exists
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as Project);

      // Mock media generation creation
      const mockMediaGeneration = {
        id: 'media-id',
        userId,
        projectId,
        mediaType: MediaType.VIDEO,
        prompt,
        parameters: parameters as any,
        status: RequestStatus.PROCESSING,
        createdAt: new Date(),
      };

      mockPrismaService.mediaGeneration.create.mockResolvedValue(
        mockMediaGeneration as MediaGeneration,
      );

      // Mock Vertex AI error
      const error = new Error('API Error');
      mockVertexAiService.initiateVideoGeneration.mockRejectedValue(error);

      const operationId = 'operations/1234567890';

      // Call the service method and expect it to throw
      await expect(
        service.initiateVideoGeneration(userId, projectId, prompt, parameters, operationId),
      ).rejects.toThrow();

      // Verify the media generation record was updated with failure status
      expect(mockPrismaService.mediaGeneration.update).toHaveBeenCalledWith({
        where: { id: mockMediaGeneration.id },
        data: expect.objectContaining({
          status: RequestStatus.FAILED,
          errorMessage: expect.any(String),
        }),
      });
    });
  });

  describe('checkVideoGenerationStatus', () => {
    it('should call Vertex AI service to check video generation status', async () => {
      const operationName = 'operations/1234567890';
      const mockResponse = { done: true, response: { videos: [] } };

      mockVertexAiService.checkVideoGenerationStatus.mockResolvedValue(mockResponse);

      const result = await service.checkVideoGenerationStatus(operationName);

      expect(mockVertexAiService.checkVideoGenerationStatus).toHaveBeenCalledWith(operationName);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('handleCompletedVideoGeneration', () => {
    const userId = 'user-id';
    const operationName = 'operations/1234567890';
    const mockPredictions = [
      {
        gcsUri: 'gs://media-gen-bucket/video.mp4',
        mimeType: 'video/mp4',
        prompt: 'A beautiful landscape video',
      },
    ];

    it('should find the media generation record by operation name', async () => {
      mockPrismaService.mediaGeneration.findFirst.mockResolvedValue(null);

      await service.handleCompletedVideoGeneration(userId, operationName, mockPredictions);

      expect(mockPrismaService.mediaGeneration.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          parameters: {
            path: ['operationName'],
            equals: operationName,
          },
        },
      });
    });

    it('should create media results and update generation status to success', async () => {
      // Mock finding the media generation
      const mockMediaGeneration = {
        id: 'media-id',
        userId,
        prompt: 'A beautiful landscape video',
        parameters: {
          operationName,
        },
        status: RequestStatus.PROCESSING,
      };
      mockPrismaService.mediaGeneration.findFirst.mockResolvedValue(mockMediaGeneration);

      // Mock media result creation
      mockPrismaService.mediaResult.create.mockResolvedValue({
        id: 'result-id',
        mediaGenerationId: 'media-id',
        resultUrl: 'gs://media-gen-bucket/video.mp4',
        metadata: {
          mimeType: 'video/mp4',
        },
      });

      await service.handleCompletedVideoGeneration(userId, operationName, mockPredictions);

      // Verify media result was created with GCS URI
      expect(mockPrismaService.mediaResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mediaGenerationId: 'media-id',
          resultUrl: 'gs://media-gen-bucket/video.mp4',
          metadata: expect.objectContaining({
            mimeType: 'video/mp4',
          }),
        }),
      });

      // Verify status was updated to SUCCEEDED
      expect(mockPrismaService.mediaGeneration.update).toHaveBeenCalledWith({
        where: { id: 'media-id' },
        data: { status: RequestStatus.SUCCEEDED },
      });
    });

    it('should handle errors and update generation status to failed', async () => {
      // Mock finding the media generation
      const mockMediaGeneration = {
        id: 'media-id',
        userId,
        prompt: 'A beautiful landscape video',
        parameters: {
          operationName,
        },
        status: RequestStatus.PROCESSING,
      };
      mockPrismaService.mediaGeneration.findFirst.mockResolvedValue(mockMediaGeneration);

      // Mock error during media result creation
      const error = new Error('Failed to create media result');
      mockPrismaService.mediaResult.create.mockRejectedValue(error);

      await service.handleCompletedVideoGeneration(userId, operationName, mockPredictions);

      // Verify status was updated to FAILED
      expect(mockPrismaService.mediaGeneration.update).toHaveBeenCalledWith({
        where: { id: 'media-id' },
        data: expect.objectContaining({
          status: RequestStatus.FAILED,
          errorMessage: expect.stringContaining('Failed to create media result'),
        }),
      });
    });
  });
});
