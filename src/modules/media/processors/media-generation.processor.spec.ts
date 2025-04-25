import { Test, TestingModule } from '@nestjs/testing';
import { BullModule as NestBullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { MediaGenerationProcessor } from './media-generation.processor';
import { MediaService } from '../media.service';
import { MEDIA_GENERATION_QUEUE, MediaGenerationJob } from '../queues/media-generation.queue';
import { Job } from 'bull';
import { getQueueToken } from '@nestjs/bull';

describe('MediaGenerationProcessor', () => {
  let processor: MediaGenerationProcessor;
  let mediaService: MediaService;

  const mockMediaService = {
    initiateVideoGeneration: jest.fn(),
    checkVideoGenerationStatus: jest.fn(),
    handleCompletedVideoGeneration: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        NestBullModule.registerQueue({
          name: MEDIA_GENERATION_QUEUE,
        }),
      ],
      providers: [
        MediaGenerationProcessor,
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    })
      .overrideProvider(getQueueToken(MEDIA_GENERATION_QUEUE))
      .useValue(mockQueue)
      .compile();

    processor = module.get<MediaGenerationProcessor>(MediaGenerationProcessor);
    mediaService = module.get<MediaService>(MediaService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleInitiateVideoGeneration', () => {
    it('should call initiateVideoGeneration and add poll job to queue', async () => {
      const mockJob = {
        data: {
          userId: '123',
          projectId: 'project123',
          prompt: 'test prompt',
          parameters: { test: 'param' },
          operationId: 'operations/1234567890',
        },
      } as Job;

      const operationName = 'projects/123/locations/us-central1/operations/456';
      mockMediaService.initiateVideoGeneration.mockResolvedValue(operationName);

      await processor.handleInitiateVideoGeneration(mockJob);

      expect(mediaService.initiateVideoGeneration).toHaveBeenCalledWith(
        mockJob.data.userId,
        mockJob.data.projectId,
        mockJob.data.prompt,
        mockJob.data.parameters,
        mockJob.data.operationId,
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        MediaGenerationJob.POLL_VIDEO_GENERATION,
        {
          userId: mockJob.data.userId,
          operationName,
          retryCount: 0,
        },
        {
          delay: 5000,
        },
      );
    });
  });

  describe('handlePollVideoGeneration', () => {
    it('should check video generation status and add another poll job if not completed', async () => {
      const mockJob = {
        data: {
          userId: '123',
          operationName: 'projects/123/locations/us-central1/operations/456',
          retryCount: 0,
        },
      } as Job;

      mockMediaService.checkVideoGenerationStatus.mockResolvedValue({
        done: false,
      });

      await processor.handlePollVideoGeneration(mockJob);

      expect(mediaService.checkVideoGenerationStatus).toHaveBeenCalledWith(
        mockJob.data.operationName,
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        MediaGenerationJob.POLL_VIDEO_GENERATION,
        {
          userId: mockJob.data.userId,
          operationName: mockJob.data.operationName,
          retryCount: 1,
        },
        {
          delay: 5000,
        },
      );
    });

    it('should check video generation status and not add poll job if completed', async () => {
      const mockJob = {
        data: {
          userId: '123',
          operationName: 'projects/123/locations/us-central1/operations/456',
          retryCount: 0,
        },
      } as Job;

      const mockVideos = [
        { gcsUri: 'gs://bucket/video1.mp4', mimeType: 'video/mp4', prompt: 'test' },
      ];

      mockMediaService.checkVideoGenerationStatus.mockResolvedValue({
        done: true,
        response: { videos: mockVideos },
      });

      await processor.handlePollVideoGeneration(mockJob);

      expect(mediaService.checkVideoGenerationStatus).toHaveBeenCalledWith(
        mockJob.data.operationName,
      );

      expect(mediaService.handleCompletedVideoGeneration).toHaveBeenCalledWith(
        mockJob.data.userId,
        mockJob.data.operationName,
        mockVideos,
      );

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should handle error in response when operation completed with error', async () => {
      const mockJob = {
        data: {
          userId: '123',
          operationName: 'projects/123/locations/us-central1/operations/456',
          retryCount: 0,
        },
      } as Job;

      mockMediaService.checkVideoGenerationStatus.mockResolvedValue({
        done: true,
        error: { code: 400, message: 'Bad Request' },
      });

      await processor.handlePollVideoGeneration(mockJob);

      expect(mediaService.checkVideoGenerationStatus).toHaveBeenCalledWith(
        mockJob.data.operationName,
      );

      // handleCompletedVideoGeneration should not be called on error
      expect(mediaService.handleCompletedVideoGeneration).not.toHaveBeenCalled();

      // No new polling job should be added
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should throw error if max retries reached', async () => {
      const mockJob = {
        data: {
          userId: '123',
          operationName: 'projects/123/locations/us-central1/operations/456',
          retryCount: 20, // Max retries
        },
      } as Job;

      await expect(processor.handlePollVideoGeneration(mockJob)).rejects.toThrow(
        'Maximum polling attempts reached',
      );
    });
  });
});
