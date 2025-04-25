import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { ImagenService } from './imagen.service';
import { GoogleCloudService } from '../../google-cloud/google-cloud.service';
import { ImagenApiError } from '../vertex-ai.errors';
import { ModelType } from '../types/models.types';

describe('ImagenService', () => {
  let service: ImagenService;
  let httpService: HttpService;
  let configService: ConfigService;
  let googleCloudService: GoogleCloudService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: string) => {
      const config = {
        VERTEX_AI_LOCATION: 'us-central1',
        VERTEX_AI_PROJECT_ID: 'test-project',
        VERTEX_AI_IMAGEN_MODEL_ID: 'imagen-3.0-generate-002',
        VERTEX_AI_STORAGE_URI: 'gs://test-bucket/output',
      };
      return config[key as keyof typeof config] || defaultValue;
    }),
  };

  const mockGoogleCloudService = {
    getAccessToken: jest.fn().mockResolvedValue('test-token'),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImagenService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: GoogleCloudService,
          useValue: mockGoogleCloudService,
        },
      ],
    }).compile();

    service = module.get<ImagenService>(ImagenService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    googleCloudService = module.get<GoogleCloudService>(GoogleCloudService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateImage', () => {
    it('should call the Imagen API and return the image data', async () => {
      const mockResponse = {
        data: {
          predictions: [
            {
              mimeType: 'image/png',
              gcsUri: 'gs://test-bucket/output/image.png',
            },
          ],
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.generateImage({ prompt: 'test image' });

      expect(mockGoogleCloudService.getAccessToken).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('us-central1-aiplatform.googleapis.com'),
        expect.objectContaining({
          instances: [{ prompt: 'test image' }],
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw ImagenApiError when API call fails', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('API error')));

      await expect(service.generateImage({ prompt: 'test image' })).rejects.toThrow(ImagenApiError);
    });
  });

  describe('getModelEndpoint', () => {
    it('should return the correct endpoint', () => {
      expect(service['getModelEndpoint']()).toContain('imagen-3.0-generate-002');
      expect(service['getModelEndpoint']()).toContain('predict');
    });
  });
});
