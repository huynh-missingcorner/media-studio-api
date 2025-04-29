import { Injectable } from '@nestjs/common';
import { GoogleCloudFileService } from '../../shared/infrastructure/google-cloud/google-cloud-file.service';
import { FileUploadInput } from '../../shared/infrastructure/google-cloud/google-cloud-file.types';
import { GoogleCloudService } from '../../shared/infrastructure/google-cloud/google-cloud.service';
import { FileInfo } from './dto/upload-file-response.dto';

/**
 * Service for file operations, delegating to GoogleCloudFileService.
 */
@Injectable()
export class FileService {
  constructor(
    private readonly googleCloudFileService: GoogleCloudFileService,
    private readonly googleCloudService: GoogleCloudService,
  ) {}

  /**
   * Upload a file and return the GCS URI with signed URL.
   * @param input File upload input
   * @returns The GCS URI and signed URL of the uploaded file
   */
  async uploadFile(input: FileUploadInput): Promise<FileInfo> {
    const result = await this.googleCloudFileService.uploadFile(input);
    const signedUrl = await this.googleCloudService.createSignedUrl(result.gcsUri);
    return {
      gcsUri: result.gcsUri,
      signedUrl,
    };
  }

  /**
   * Upload multiple files and return their GCS URIs with signed URLs.
   * @param inputs Array of file upload inputs
   * @returns Array of file info with GCS URIs and signed URLs
   */
  async uploadMultipleFiles(inputs: FileUploadInput[]): Promise<FileInfo[]> {
    const results = await this.googleCloudFileService.uploadMultipleFiles(inputs);

    // Generate signed URLs for each uploaded file
    const fileInfoPromises = results.map(async (result) => {
      const signedUrl = await this.googleCloudService.createSignedUrl(result.gcsUri);
      return {
        gcsUri: result.gcsUri,
        signedUrl,
      };
    });

    return Promise.all(fileInfoPromises);
  }

  /**
   * Download a file from GCS as a buffer.
   * @param gcsUri The GCS URI
   * @returns The file buffer
   */
  async downloadFile(gcsUri: string): Promise<Buffer> {
    return this.googleCloudFileService.downloadFile(gcsUri);
  }

  /**
   * Generate a signed URL for a GCS URI.
   * @param userId User ID requesting the signed URL
   * @param gcsUri The GCS URI
   * @returns The signed URL
   */
  async getSignedUrl(userId: string, gcsUri: string): Promise<string> {
    return this.googleCloudService.createSignedUrl(gcsUri);
  }
}
