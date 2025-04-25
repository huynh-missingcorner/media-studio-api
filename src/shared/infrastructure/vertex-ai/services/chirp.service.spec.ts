import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChirpService } from './chirp.service';
import { Storage } from '@google-cloud/storage';

// Mock the TextToSpeechClient synthesizeSpeech method
const mockSynthesizeSpeech = jest.fn().mockResolvedValue([
  {
    audioContent: Buffer.from('test-audio-content'),
  },
]);

// Mock the TextToSpeechClient class
jest.mock('@google-cloud/text-to-speech', () => {
  return {
    TextToSpeechClient: jest.fn().mockImplementation(() => ({
      synthesizeSpeech: mockSynthesizeSpeech,
    })),
  };
});

// Mock the Storage methods
const mockSave = jest.fn().mockResolvedValue([]);
const mockGetSignedUrl = jest.fn().mockResolvedValue(['https://test-signed-url.com']);
const mockFile = jest.fn().mockReturnValue({
  save: mockSave,
  getSignedUrl: mockGetSignedUrl,
});
const mockBucket = jest.fn().mockReturnValue({
  file: mockFile,
});

// Mock the Storage class
jest.mock('@google-cloud/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => ({
      bucket: mockBucket,
    })),
  };
});

describe('ChirpService', () => {
  let service: ChirpService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: string) => {
      const config = {
        STORAGE_BUCKET_NAME: 'test-bucket',
      };
      return config[key as keyof typeof config] || defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChirpService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: Storage,
          useValue: new Storage(),
        },
      ],
    }).compile();

    service = module.get<ChirpService>(ChirpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('synthesizeSpeech', () => {
    it('should call TextToSpeechClient.synthesizeSpeech with correct parameters', async () => {
      const text = 'Hello world';

      await service.synthesizeSpeech(text);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith({
        input: { text },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Standard-C',
          ssmlGender: 'NEUTRAL',
        },
        audioConfig: {
          audioEncoding: 'MP3',
        },
      });
    });

    it('should return a Buffer with audio content', async () => {
      const result = await service.synthesizeSpeech('Hello world');

      expect(result).toBeInstanceOf(Buffer);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should throw an error when synthesis fails', async () => {
      mockSynthesizeSpeech.mockRejectedValueOnce(new Error('Synthesis failed'));

      await expect(service.synthesizeSpeech('Hello world')).rejects.toThrow(
        'Failed to synthesize speech: Synthesis failed',
      );
    });
  });

  describe('synthesizeAndStoreSpeech', () => {
    it('should synthesize speech and save to GCS', async () => {
      const params = {
        text: 'Hello world',
        voice: 'en-US-Standard-A',
      };

      const result = await service.synthesizeAndStoreSpeech(params);

      // Check that synthesizeSpeech was called
      expect(mockSynthesizeSpeech).toHaveBeenCalled();

      // Check that Storage.bucket was called with correct bucket name
      expect(mockBucket).toHaveBeenCalledWith('test-bucket');

      // Check that bucket.file was called with a path that includes audio directory
      expect(mockFile).toHaveBeenCalledWith(expect.stringContaining('audio/'));

      // Check that file.save was called with audio data and correct metadata
      expect(mockSave).toHaveBeenCalledWith(expect.any(Buffer), {
        metadata: {
          contentType: 'audio/mp3',
        },
      });

      // Check that file.getSignedUrl was called to generate a URL
      expect(mockGetSignedUrl).toHaveBeenCalledWith({
        action: 'read',
        expires: expect.any(Number),
      });

      // Check the result
      expect(result.audioUrl).toBe('https://test-signed-url.com');
      expect(result.filePath).toMatch(/audio\/.+\.mp3$/);
    });

    it('should handle storage errors', async () => {
      mockSave.mockRejectedValueOnce(new Error('Storage error'));

      await expect(service.synthesizeAndStoreSpeech({ text: 'Test' })).rejects.toThrow(
        'Failed to store audio file: Storage error',
      );
    });
  });
});
