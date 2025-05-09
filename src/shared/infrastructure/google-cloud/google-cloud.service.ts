import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class GoogleCloudService {
  private readonly logger = new Logger(GoogleCloudService.name);
  private readonly projectId: string;
  private readonly storage: Storage;
  private readonly signedUrlExpirationTimeHours: number;
  private readonly storageBucket: string;

  constructor(private readonly configService: ConfigService) {
    this.projectId = this.configService.get<string>('VERTEX_AI_PROJECT_ID', 'default_project_id');
    this.signedUrlExpirationTimeHours = this.configService.get<number>(
      'GCS_SIGNED_URL_EXPIRATION_HOURS',
      24,
    );
    this.storageBucket = this.configService.get<string>(
      'GCS_STORAGE_BUCKET',
      'default-storage-bucket',
    );

    this.storage = new Storage({
      projectId: this.projectId,
    });
  }

  /**
   * Authenticate with Google Cloud and get an access token
   * @returns The access token
   */
  async getAccessToken(): Promise<string> {
    try {
      this.logger.log(`Getting access token for project ${this.projectId}`);

      const auth = new GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/cloud-vision',
        ],
        projectId: this.projectId,
      });

      const client = await auth.getClient();
      const { token } = await client.getAccessToken();

      if (!token) {
        throw new Error('No token returned from Google authentication');
      }

      return token;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error authenticating with Google Cloud: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Error authenticating with Google Cloud: ${String(error)}`);
      }
      throw new Error('Failed to authenticate with Google Cloud');
    }
  }

  /**
   * Generate a signed URL from a Google Cloud Storage URI
   * @param gcsUri The Google Cloud Storage URI (gs://bucket-name/path/to/file)
   * @returns A signed URL that can be accessed by a browser
   */
  async createSignedUrl(gcsUri: string): Promise<string> {
    try {
      this.logger.log(`Creating signed URL for ${gcsUri}`);

      // Parse the GCS URI to extract bucket and file path
      const matches = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);

      if (!matches || matches.length !== 3) {
        throw new Error('Invalid Google Cloud Storage URI format');
      }

      const [, bucketName, filePath] = matches;

      // Calculate expiration time (default 24 hours)
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + this.signedUrlExpirationTimeHours);

      // Generate signed URL
      const options = {
        version: 'v4' as const,
        action: 'read' as const,
        expires: expirationDate,
      };

      const [signedUrl] = await this.storage
        .bucket(bucketName)
        .file(filePath)
        .getSignedUrl(options);

      return signedUrl;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error creating signed URL: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Re-throw the specific error
      if (errorMessage === 'Invalid Google Cloud Storage URI format') {
        throw new Error('Invalid Google Cloud Storage URI format');
      }

      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Upload base64 encoded data to Google Cloud Storage
   * @param base64Data The base64 encoded data
   * @param fileName The name of the file to create
   * @param mimeType The MIME type of the file
   * @param userId User ID for organizing storage
   * @param projectId Project ID for organizing storage
   * @returns The Google Cloud Storage URI (gs://bucket-name/path/to/file)
   */
  async uploadBase64ToGcs(
    base64Data: string,
    fileName: string,
    mimeType: string,
    userId: string,
    projectId: string,
  ): Promise<string> {
    try {
      // Create a unique path for the file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `users/${userId}/projects/${projectId}/upscaled/${timestamp}_${fileName}`;

      this.logger.log(`Uploading base64 data to ${filePath}`);

      // Decode base64 string to buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Get bucket reference
      const bucket = this.storage.bucket(this.storageBucket);
      const file = bucket.file(filePath);

      // Upload the buffer to GCS
      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
        },
      });

      // Return the GCS URI
      return `gs://${this.storageBucket}/${filePath}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error uploading base64 data to GCS: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error('Failed to upload base64 data to Google Cloud Storage');
    }
  }
}
