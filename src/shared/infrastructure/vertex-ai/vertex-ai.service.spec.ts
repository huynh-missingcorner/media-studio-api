import { Test, TestingModule } from '@nestjs/testing';
import { VertexAiService } from './vertex-ai.service';
import { ImagenService } from './services/imagen.service';
import { VeoService } from './services/veo.service';
import { LyriaService } from './services/lyria.service';
import { ChirpService } from './services/chirp.service';
import { ImagenApiError, VeoApiError, LyriaApiError, ChirpApiError } from './vertex-ai.errors';

describe('VertexAiService', () => {
  let service: VertexAiService;
  let imagenService: ImagenService;
  let veoService: VeoService;
  let lyriaService: LyriaService;
  let chirpService: ChirpService;

  const mockImagenService = {
    generateImage: jest.fn(),
  };

  const mockVeoService = {
    initiateVideoGeneration: jest.fn(),
    checkOperationStatus: jest.fn(),
  };

  const mockLyriaService = {
    generateMusic: jest.fn(),
  };

  const mockChirpService = {
    generateSpeech: jest.fn(),
    synthesizeSpeech: jest.fn(),
    synthesizeAndStoreSpeech: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VertexAiService,
        {
          provide: ImagenService,
          useValue: mockImagenService,
        },
        {
          provide: VeoService,
          useValue: mockVeoService,
        },
        {
          provide: LyriaService,
          useValue: mockLyriaService,
        },
        {
          provide: ChirpService,
          useValue: mockChirpService,
        },
      ],
    }).compile();

    service = module.get<VertexAiService>(VertexAiService);
    imagenService = module.get<ImagenService>(ImagenService);
    veoService = module.get<VeoService>(VeoService);
    lyriaService = module.get<LyriaService>(LyriaService);
    chirpService = module.get<ChirpService>(ChirpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateImage', () => {
    it('should call ImagenService and return the result', async () => {
      const mockResponse = {
        predictions: [
          {
            mimeType: 'image/png',
            gcsUri: 'gs://test-bucket/output/image.png',
          },
        ],
      };

      mockImagenService.generateImage.mockResolvedValue(mockResponse);

      const params = { prompt: 'test image' };
      const result = await service.generateImage(params);

      expect(mockImagenService.generateImage).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors from ImagenService', async () => {
      const error = new ImagenApiError('Test error', new Error('Original error'));
      mockImagenService.generateImage.mockRejectedValue(error);

      await expect(service.generateImage({ prompt: 'test image' })).rejects.toThrow(ImagenApiError);
    });
  });

  describe('initiateVideoGeneration', () => {
    it('should call VeoService.initiateVideoGeneration and return the operation name', async () => {
      const operationName = 'projects/123/locations/us-central1/operations/456';
      mockVeoService.initiateVideoGeneration.mockResolvedValue(operationName);

      const params = { prompt: 'test video', durationSeconds: 1 };
      const result = await service.initiateVideoGeneration(params);

      expect(mockVeoService.initiateVideoGeneration).toHaveBeenCalledWith(params);
      expect(result).toEqual(operationName);
    });

    it('should propagate errors from VeoService', async () => {
      const error = new VeoApiError('Test error', new Error('Original error'));
      mockVeoService.initiateVideoGeneration.mockRejectedValue(error);

      await expect(service.initiateVideoGeneration({ prompt: 'test video' })).rejects.toThrow(
        VeoApiError,
      );
    });
  });

  describe('checkVideoGenerationStatus', () => {
    it('should call VeoService.checkOperationStatus and return the status', async () => {
      const operationName = 'projects/123/locations/us-central1/operations/456';
      const mockResponse = {
        name: operationName,
        done: true,
        response: {
          '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.PredictResponse',
          videos: [
            {
              gcsUri: 'gs://test-bucket/output/video.mp4',
              mimeType: 'video/mp4',
            },
          ],
        },
      };

      mockVeoService.checkOperationStatus.mockResolvedValue(mockResponse);

      const result = await service.checkVideoGenerationStatus(operationName);

      expect(mockVeoService.checkOperationStatus).toHaveBeenCalledWith(operationName);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors from VeoService', async () => {
      const operationName = 'projects/123/locations/us-central1/operations/456';
      const error = new VeoApiError('Test error', new Error('Original error'));
      mockVeoService.checkOperationStatus.mockRejectedValue(error);

      await expect(service.checkVideoGenerationStatus(operationName)).rejects.toThrow(VeoApiError);
    });
  });

  describe('generateMusic', () => {
    it('should call LyriaService and return the result', async () => {
      const mockResponse = {
        predictions: [
          {
            mimeType: 'audio/mp3',
            gcsUri: 'gs://test-bucket/output/music.mp3',
          },
        ],
      };

      mockLyriaService.generateMusic.mockResolvedValue(mockResponse);

      const params = { prompt: 'test music' };
      const result = await service.generateMusic(params);

      expect(mockLyriaService.generateMusic).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors from LyriaService', async () => {
      const error = new LyriaApiError('Test error', new Error('Original error'));
      mockLyriaService.generateMusic.mockRejectedValue(error);

      await expect(service.generateMusic({ prompt: 'test music' })).rejects.toThrow(LyriaApiError);
    });
  });

  describe('generateSpeech', () => {
    it('should call ChirpService and return the result', async () => {
      const mockBuffer = Buffer.from('test audio content');
      mockChirpService.synthesizeSpeech.mockResolvedValue(mockBuffer);

      const text = 'Hello world';
      const result = await service.generateSpeech(text);

      expect(mockChirpService.synthesizeSpeech).toHaveBeenCalledWith(text);
      expect(result).toEqual(mockBuffer);
    });

    it('should propagate errors from ChirpService', async () => {
      const error = new ChirpApiError('Test error', new Error('Original error'));
      mockChirpService.synthesizeSpeech.mockRejectedValue(error);

      await expect(service.generateSpeech('Hello world')).rejects.toThrow(ChirpApiError);
    });
  });

  describe('synthesizeAndStoreSpeech', () => {
    it('should call ChirpService and return the result', async () => {
      const mockResponse = {
        audioUrl: 'https://storage.googleapis.com/test-bucket/audio.mp3',
        filePath: 'audio/audio.mp3',
      };

      mockChirpService.synthesizeAndStoreSpeech.mockResolvedValue(mockResponse);

      const params = { text: 'Hello world', voice: 'en-US-Standard-A' };
      const result = await service.synthesizeAndStoreSpeech(params);

      expect(mockChirpService.synthesizeAndStoreSpeech).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors from ChirpService', async () => {
      const error = new ChirpApiError('Test error', new Error('Original error'));
      mockChirpService.synthesizeAndStoreSpeech.mockRejectedValue(error);

      await expect(service.synthesizeAndStoreSpeech({ text: 'Hello world' })).rejects.toThrow(
        ChirpApiError,
      );
    });
  });
});
