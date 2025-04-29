import { Readable } from 'stream';

/**
 * Input for uploading a file to Google Cloud Storage.
 */
export interface FileUploadInput {
  /**
   * The file buffer or readable stream to upload.
   */
  readonly buffer: Buffer | Readable;
  /**
   * The file name (used as the default destination path).
   */
  readonly filename: string;
  /**
   * The MIME type of the file.
   */
  readonly mimetype: string;
  /**
   * The destination path in the bucket (optional, defaults to filename).
   */
  readonly destinationPath?: string;
  /**
   * The bucket name (optional, defaults to configured default bucket).
   */
  readonly bucket?: string;
}

/**
 * Result of a file upload to Google Cloud Storage.
 */
export interface FileUploadResult {
  /**
   * The GCS URI of the uploaded file (gs://bucket-name/path/to/file).
   */
  readonly gcsUri: string;
}
