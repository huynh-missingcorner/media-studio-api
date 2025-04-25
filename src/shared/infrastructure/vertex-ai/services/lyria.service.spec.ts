import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { LyriaService } from './lyria.service';
import { GoogleCloudService } from '../../google-cloud/google-cloud.service';
import { LyriaApiError } from '../vertex-ai.errors';

describe('LyriaService', () => {
  let service: LyriaService;
  let httpService: HttpService;
  let configService: ConfigService;
  let googleCloudService: GoogleCloudService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: string) => {
      const config = {
        VERTEX_AI_LOCATION: 'us-central1',
        VERTEX_AI_PROJECT_ID: 'test-project',
        VERTEX_AI_LYRIA_MODEL_ID: 'lyria-1.0-generate',
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
        LyriaService,
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

    service = module.get<LyriaService>(LyriaService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    googleCloudService = module.get<GoogleCloudService>(GoogleCloudService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateMusic', () => {
    it('should call the Lyria API and return the music data', async () => {
      const mockResponse = {
        data: {
          predictions: [
            {
              mimeType: 'audio/mp3',
              gcsUri: 'gs://test-bucket/output/music.mp3',
            },
          ],
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.generateMusic({ prompt: 'test music' });

      expect(mockGoogleCloudService.getAccessToken).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('lyria-1.0-generate'),
        expect.objectContaining({
          instances: [{ prompt: 'test music' }],
        }),
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include audioReference when provided', async () => {
      const mockResponse = {
        data: {
          predictions: [
            {
              mimeType: 'audio/mp3',
              gcsUri: 'gs://test-bucket/output/music.mp3',
            },
          ],
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const audioReference = {
        gcsUri: 'gs://test-bucket/reference.mp3',
        bytesBase64Encoded: 'test-bytes',
      };
      const result = await service.generateMusic({ prompt: 'test music', audioReference });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          instances: [{ prompt: 'test music', audioReference }],
        }),
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw LyriaApiError when API call fails', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('API error')));

      await expect(service.generateMusic({ prompt: 'test music' })).rejects.toThrow(LyriaApiError);
    });
  });

  describe('getModelEndpoint', () => {
    it('should return the correct endpoint', () => {
      expect(service['getModelEndpoint']()).toContain('lyria-1.0-generate');
      expect(service['getModelEndpoint']()).toContain('predict');
    });
  });
});
