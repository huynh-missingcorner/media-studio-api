import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleCloudService } from './google-cloud.service';

// Mock the GoogleAuth class
const mockGetClient = jest.fn();
const mockGetAccessToken = jest.fn();

// Mock the Storage class
const mockGetSignedUrl = jest.fn();
const mockBucket = jest.fn();
const mockFile = jest.fn();

jest.mock('google-auth-library', () => {
  return {
    GoogleAuth: jest.fn().mockImplementation(() => {
      return {
        getClient: mockGetClient,
      };
    }),
  };
});

jest.mock('@google-cloud/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => {
      return {
        bucket: mockBucket.mockImplementation(() => {
          return {
            file: mockFile.mockImplementation(() => {
              return {
                getSignedUrl: mockGetSignedUrl,
              };
            }),
          };
        }),
      };
    }),
  };
});

describe('GoogleCloudService', () => {
  let service: GoogleCloudService;

  beforeEach(async () => {
    // Reset mocks before each test
    mockGetClient.mockReset();
    mockGetAccessToken.mockReset();
    mockGetSignedUrl.mockReset();
    mockBucket.mockReset();
    mockFile.mockReset();

    // Configure default mock behavior
    mockGetClient.mockResolvedValue({
      getAccessToken: mockGetAccessToken.mockResolvedValue({ token: 'test-token' }),
    });

    mockGetSignedUrl.mockResolvedValue(['https://signed-url.example.com/image.jpg']);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [GoogleCloudService, ConfigService],
    }).compile();

    service = module.get<GoogleCloudService>(GoogleCloudService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAccessToken', () => {
    it('should return an access token', async () => {
      const result = await service.getAccessToken();
      expect(result).toBe('test-token');
    });

    it('should throw an error if Google authentication fails', async () => {
      // Mock the getClient method to throw an error
      mockGetClient.mockRejectedValueOnce(new Error('Authentication failed'));

      await expect(service.getAccessToken()).rejects.toThrow(
        'Failed to authenticate with Google Cloud',
      );
    });
  });

  describe('createSignedUrl', () => {
    it('should parse GCS URI and return a signed URL', async () => {
      const gcsUri = 'gs://bucket-name/path/to/image.jpg';
      const result = await service.createSignedUrl(gcsUri);

      expect(mockBucket).toHaveBeenCalledWith('bucket-name');
      expect(mockFile).toHaveBeenCalledWith('path/to/image.jpg');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'read',
          expires: expect.any(Date),
        }),
      );
      expect(result).toBe('https://signed-url.example.com/image.jpg');
    });

    it('should throw an error for invalid GCS URI format', async () => {
      const invalidUri = 'invalid-uri';
      await expect(service.createSignedUrl(invalidUri)).rejects.toThrow(
        'Invalid Google Cloud Storage URI format',
      );
    });

    it('should throw an error if signed URL generation fails', async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error('Signing failed'));

      const gcsUri = 'gs://bucket-name/path/to/image.jpg';
      await expect(service.createSignedUrl(gcsUri)).rejects.toThrow(
        'Failed to generate signed URL',
      );
    });
  });
});
