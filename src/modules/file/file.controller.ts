import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Res,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { Response } from 'express';
import {
  UploadFileResponseDto,
  MultipleUploadFileResponseDto,
} from './dto/upload-file-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FileUploadInput } from '../../shared/infrastructure/google-cloud/google-cloud-file.types';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FileController {
  constructor(private readonly fileService: FileService) {}

  /**
   * Upload a file to Google Cloud Storage.
   * @param file The uploaded file
   * @returns The GCS URI and signed URL of the uploaded file
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to Google Cloud Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'File successfully uploaded',
    type: UploadFileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file upload',
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<UploadFileResponseDto> {
    if (
      !file ||
      typeof file !== 'object' ||
      !('buffer' in file) ||
      !('originalname' in file) ||
      !('mimetype' in file)
    ) {
      throw new BadRequestException('Invalid file upload');
    }

    // Apply a type assertion to the entire file object after validation
    const typedFile = file as {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
    };

    const fileInfo = await this.fileService.uploadFile({
      buffer: typedFile.buffer,
      filename: typedFile.originalname,
      mimetype: typedFile.mimetype,
    });

    return new UploadFileResponseDto(fileInfo.gcsUri, fileInfo.signedUrl);
  }

  /**
   * Upload multiple files to Google Cloud Storage.
   * @param files The uploaded files
   * @returns Array of file information with GCS URIs and signed URLs
   */
  @Post('upload-multiple')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 10)) // Limit to 10 files
  @ApiOperation({ summary: 'Upload multiple files to Google Cloud Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload (maximum 10)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Files successfully uploaded',
    type: MultipleUploadFileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file upload',
  })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<MultipleUploadFileResponseDto> {
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Validate and transform each file for upload
    const fileInputs: FileUploadInput[] = [];

    for (const file of files) {
      if (
        !file ||
        typeof file !== 'object' ||
        !('buffer' in file) ||
        !('originalname' in file) ||
        !('mimetype' in file)
      ) {
        throw new BadRequestException('Invalid file in upload');
      }

      // Use a direct object creation approach instead of type assertions
      const fileInput: FileUploadInput = {
        buffer: file.buffer,
        filename: file.originalname,
        mimetype: file.mimetype,
      };

      fileInputs.push(fileInput);
    }

    const fileInfos = await this.fileService.uploadMultipleFiles(fileInputs);
    return new MultipleUploadFileResponseDto(fileInfos);
  }

  /**
   * Download a file from Google Cloud Storage.
   * @param gcsUri The GCS URI as a query parameter
   * @param res The response object
   */
  @Get('download')
  @ApiOperation({ summary: 'Download a file from Google Cloud Storage' })
  @ApiQuery({
    name: 'gcsUri',
    required: true,
    description: 'Google Cloud Storage URI of the file to download',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File successfully downloaded',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid GCS URI provided',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File not found in storage',
  })
  async downloadFile(@Query('gcsUri') gcsUri: string, @Res() res: Response): Promise<void> {
    const fileBuffer = await this.fileService.downloadFile(gcsUri);
    // Set headers for download
    res.setHeader('Content-Disposition', 'attachment');
    res.send(fileBuffer);
  }

  /**
   * Get a signed URL for accessing a file in Google Cloud Storage.
   * @param user The authenticated user
   * @param gcsUri The GCS URI
   * @returns A signed URL with temporary access
   */
  @Get('signed-url')
  @ApiOperation({ summary: 'Get a signed URL for a media file' })
  @ApiQuery({
    name: 'gcsUri',
    required: true,
    description: 'Google Cloud Storage URI of the file',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL retrieved',
  })
  async getSignedUrl(@CurrentUser() user: User, @Query('gcsUri') gcsUri: string): Promise<string> {
    return this.fileService.getSignedUrl(user.id, gcsUri);
  }
}
