import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for upload file response.
 */
export class UploadFileResponseDto {
  /**
   * The GCS URI of the uploaded file.
   */
  @ApiProperty({
    description: 'Google Cloud Storage URI of the uploaded file',
    example: 'gs://your-bucket-name/path/to/file.jpg',
  })
  readonly gcsUri: string;

  /**
   * The signed URL for accessing the file.
   */
  @ApiProperty({
    description: 'Signed URL for temporary access to the file',
    example:
      'https://storage.googleapis.com/your-bucket-name/path/to/file.jpg?X-Goog-Signature=...',
  })
  readonly signedUrl: string;

  constructor(gcsUri: string, signedUrl: string) {
    this.gcsUri = gcsUri;
    this.signedUrl = signedUrl;
  }
}

/**
 * File information with GCS URI and signed URL.
 */
export class FileInfo {
  /**
   * The GCS URI of the uploaded file.
   */
  @ApiProperty({
    description: 'Google Cloud Storage URI of the uploaded file',
    example: 'gs://your-bucket-name/path/to/file.jpg',
  })
  readonly gcsUri: string;

  /**
   * The signed URL for accessing the file.
   */
  @ApiProperty({
    description: 'Signed URL for temporary access to the file',
    example:
      'https://storage.googleapis.com/your-bucket-name/path/to/file.jpg?X-Goog-Signature=...',
  })
  readonly signedUrl: string;

  constructor(gcsUri: string, signedUrl: string) {
    this.gcsUri = gcsUri;
    this.signedUrl = signedUrl;
  }
}

/**
 * DTO for multiple file upload response.
 */
export class MultipleUploadFileResponseDto {
  /**
   * Files information with GCS URIs and signed URLs.
   */
  @ApiProperty({
    description: 'Array of file information including GCS URIs and signed URLs',
    type: [FileInfo],
  })
  readonly files: FileInfo[];

  constructor(files: FileInfo[]) {
    this.files = files;
  }
}
