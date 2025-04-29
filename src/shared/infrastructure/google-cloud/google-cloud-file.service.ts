import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import { FileUploadInput, FileUploadResult } from './google-cloud-file.types';
import { Readable } from 'stream';

/**
 * Service for handling file upload and download with Google Cloud Storage.
 */
@Injectable()
export class GoogleCloudFileService {
  private readonly logger = new Logger(GoogleCloudFileService.name);
  private readonly storage: Storage;
  private readonly defaultBucket: string;

  constructor(private readonly configService: ConfigService) {
    this.storage = new Storage({
      projectId: this.configService.get<string>('VERTEX_AI_PROJECT_ID', 'default_project_id'),
    });
    this.defaultBucket = this.configService.get<string>('STORAGE_BUCKET_NAME', 'default-bucket');
  }

  /**
   * Upload a file to Google Cloud Storage and return the GCS URI.
   * @param input File upload input (buffer, filename, mimetype, optional bucket)
   * @returns The GCS URI of the uploaded file
   */
  async uploadFile(input: FileUploadInput): Promise<FileUploadResult> {
    const bucketName = input.bucket ?? this.defaultBucket;
    const filePath = input.destinationPath ?? input.filename;
    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(filePath);
    try {
      this.logger.log(`Uploading file to gs://${bucketName}/${filePath}`);
      const stream = file.createWriteStream({
        metadata: {
          contentType: input.mimetype,
        },
        resumable: false,
      });
      await new Promise<void>((resolve, reject) => {
        stream.on('error', (err) => reject(err));
        stream.on('finish', () => resolve());
        if (Buffer.isBuffer(input.buffer)) {
          stream.end(input.buffer);
        } else if (input.buffer instanceof Readable) {
          input.buffer.pipe(stream);
        } else {
          reject(new Error('Invalid buffer type for upload'));
        }
      });
      const gcsUri = `gs://${bucketName}/${filePath}`;
      return { gcsUri };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error uploading file: ${errorMessage}`);
      throw new Error('Failed to upload file to Google Cloud Storage');
    }
  }

  /**
   * Upload multiple files to Google Cloud Storage and return their GCS URIs.
   * @param inputs Array of file upload inputs
   * @returns Array of GCS URIs for the uploaded files
   */
  async uploadMultipleFiles(inputs: FileUploadInput[]): Promise<FileUploadResult[]> {
    this.logger.log(`Uploading ${inputs.length} files to Google Cloud Storage`);
    const uploadPromises = inputs.map((input) => this.uploadFile(input));

    try {
      return await Promise.all(uploadPromises);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error uploading multiple files: ${errorMessage}`);
      throw new Error('Failed to upload one or more files to Google Cloud Storage');
    }
  }

  /**
   * Download a file from Google Cloud Storage as a buffer.
   * @param gcsUri The GCS URI (gs://bucket-name/path/to/file)
   * @returns The file buffer
   */
  async downloadFile(gcsUri: string): Promise<Buffer> {
    const matches = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid Google Cloud Storage URI format');
    }
    const [, bucketName, filePath] = matches;
    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(filePath);
    try {
      this.logger.log(`Downloading file from ${gcsUri}`);
      const [contents] = await file.download();
      return contents;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error downloading file: ${errorMessage}`);
      throw new Error('Failed to download file from Google Cloud Storage');
    }
  }
}
