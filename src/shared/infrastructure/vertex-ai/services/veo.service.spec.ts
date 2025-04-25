import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { VeoService } from './veo.service';
import { GoogleCloudService } from '../../google-cloud/google-cloud.service';
import { VeoApiError } from '../vertex-ai.errors';
import { VideoGenerationParams } from '../interfaces/generation-params.interface';
import { OperationResponse, VeoPrediction } from '../types/veo.types';

describe('VeoService', () => {
  let service: VeoService;
  let httpService: HttpService;
  let googleCloudService: GoogleCloudService;

  const mockGoogleCloudService = {
    getAccessToken: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        HttpModule,
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [
        VeoService,
        {
          provide: GoogleCloudService,
          useValue: mockGoogleCloudService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<VeoService>(VeoService);
    httpService = module.get<HttpService>(HttpService);
    googleCloudService = module.get<GoogleCloudService>(GoogleCloudService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateVideoGeneration', () => {
    const params: VideoGenerationParams = {
      prompt: 'A beautiful sunset',
      sampleCount: 1,
      durationSeconds: 1,
    };

    it('should initiate a long-running operation and return the operation name', async () => {
      const mockOperationName = 'projects/123/locations/us-central1/operations/456';
      const mockResponse: OperationResponse = {
        name: mockOperationName,
        done: false,
      };

      mockGoogleCloudService.getAccessToken.mockResolvedValue('mock-token');
      mockHttpService.post.mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { url: 'https://test.com' },
          data: mockResponse,
        } as AxiosResponse),
      );

      const result = await service.initiateVideoGeneration(params);
      expect(result).toBe(mockOperationName);
      expect(mockGoogleCloudService.getAccessToken).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/models/veo-2.0-generate-001:predictLongRunning'),
        expect.objectContaining({
          instances: [{ prompt: 'A beautiful sunset' }],
          parameters: expect.objectContaining({
            sampleCount: 1,
          }),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        }),
      );
    });

    it('should throw VeoApiError if the operation initiation fails', async () => {
      mockGoogleCloudService.getAccessToken.mockResolvedValue('mock-token');
      mockHttpService.post.mockReturnValue(throwError(() => new Error('API Error')));

      await expect(service.initiateVideoGeneration(params)).rejects.toThrow(VeoApiError);
      expect(mockGoogleCloudService.getAccessToken).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalled();
    });

    it('should throw VeoApiError if no operation name is returned', async () => {
      const mockResponse = {
        // Missing name property
        done: false,
      };

      mockGoogleCloudService.getAccessToken.mockResolvedValue('mock-token');
      mockHttpService.post.mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { url: 'https://test.com' },
          data: mockResponse,
        } as AxiosResponse),
      );

      await expect(service.initiateVideoGeneration(params)).rejects.toThrow(
        'No operation name returned from Veo API',
      );
    });
  });

  describe('checkOperationStatus', () => {
    const operationName = 'projects/123/locations/us-central1/operations/456';

    it('should check operation status and return not done if still processing', async () => {
      const mockResponse: OperationResponse = {
        name: operationName,
        done: false,
      };

      mockGoogleCloudService.getAccessToken.mockResolvedValue('mock-token');
      mockHttpService.post.mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { url: 'https://test.com' },
          data: mockResponse,
        } as AxiosResponse),
      );

      const result = await service.checkOperationStatus(operationName);
      expect(result).toEqual(mockResponse);
      expect(result.done).toBe(false);
      expect(mockGoogleCloudService.getAccessToken).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/models/veo-2.0-generate-001:fetchPredictOperation'),
        expect.objectContaining({ operationName }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        }),
      );
    });

    it('should check operation status and return done with response if completed', async () => {
      const mockVideos: VeoPrediction[] = [
        {
          gcsUri: 'gs://bucket/video.mp4',
          mimeType: 'video/mp4',
          prompt: 'A beautiful sunset',
        },
      ];

      const mockResponse: OperationResponse = {
        name: operationName,
        done: true,
        response: {
          '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.PredictResponse',
          videos: mockVideos,
        },
      };

      mockGoogleCloudService.getAccessToken.mockResolvedValue('mock-token');
      mockHttpService.post.mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { url: 'https://test.com' },
          data: mockResponse,
        } as AxiosResponse),
      );

      const result = await service.checkOperationStatus(operationName);
      expect(result).toEqual(mockResponse);
      expect(result.done).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response?.videos).toHaveLength(1);
      expect(mockGoogleCloudService.getAccessToken).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalled();
    });

    it('should throw VeoApiError if the operation status check fails', async () => {
      mockGoogleCloudService.getAccessToken.mockResolvedValue('mock-token');
      mockHttpService.post.mockReturnValue(throwError(() => new Error('API Error')));

      let error;
      try {
        await service.checkOperationStatus(operationName);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(VeoApiError);
      expect(mockGoogleCloudService.getAccessToken).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalled();
    });

    it('should throw VeoApiError if no data is returned', async () => {
      mockGoogleCloudService.getAccessToken.mockResolvedValue('mock-token');
      mockHttpService.post.mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { url: 'https://test.com' },
          data: null, // No data
        } as AxiosResponse),
      );

      let error;
      try {
        await service.checkOperationStatus(operationName);
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.message).toContain('No data returned from operation status check');
    });
  });
});
