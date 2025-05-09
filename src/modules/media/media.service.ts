import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { VertexAiService } from '../../shared/infrastructure/vertex-ai/vertex-ai.service';
import { ImageGenerationDto } from './dto/image-generation.dto';
import { MusicGenerationDto } from './dto/music-generation.dto';
import { AudioGenerationDto } from './dto/audio-generation.dto';
import { MediaType, RequestStatus } from '@prisma/client';
import { MediaResponseDto } from './dto/media-response.dto';
import { MediaHistoryQueryDto } from './dto/media-history-query.dto';
import { PaginatedResponse } from '../../shared/dto/pagination.dto';
import { Prisma } from '@prisma/client';
import { MediaResult } from '@prisma/client';
import { GoogleCloudService } from '../../shared/infrastructure/google-cloud/google-cloud.service';
import {
  InitiateVideoGenerationJobData,
  VideoGenerationJobParameters,
} from './types/video-generation-job.types';
import {
  OperationResponse,
  VeoPrediction,
} from 'src/shared/infrastructure/vertex-ai/types/veo.types';
import { VideoGenerationDto } from './dto/video-generation.dto';
import { Queue } from 'bull';
import { MEDIA_GENERATION_QUEUE, MediaGenerationJob } from './queues/media-generation.queue';
import { InjectQueue } from '@nestjs/bull';
import { v4 as uuidv4 } from 'uuid';
import { ReferenceDataDto } from './dto/reference-data.dto';
import { ReferenceType as AppReferenceType, SecondaryReferenceType } from './types/reference.types';
import {
  ReferenceImage,
  ReferenceImageConfig,
  ReferenceType,
  MaskMode,
  SubjectType,
  ControlType,
  SubjectReferenceImage,
  MaskReferenceImage,
  StyleReferenceImage,
  ControlReferenceImage,
} from '../../shared/infrastructure/vertex-ai/interfaces/generation-params.interface';
import { ImageUpscaleDto } from './dto/image-upscale.dto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vertexAiService: VertexAiService,
    private readonly googleCloudService: GoogleCloudService,
    @InjectQueue(MEDIA_GENERATION_QUEUE) private readonly mediaQueue: Queue,
  ) {}

  async generateImage(userId: string, dto: ImageGenerationDto): Promise<MediaResponseDto> {
    // Validate project exists
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Create a record of the request with PENDING status
    const mediaGeneration = await this.prisma.mediaGeneration.create({
      data: {
        userId,
        projectId: dto.projectId,
        mediaType: MediaType.IMAGE,
        prompt: dto.prompt,
        parameters: JSON.parse(
          JSON.stringify({
            aspectRatio: dto.aspectRatio,
            sampleCount: dto.sampleCount,
            negativePrompt: dto.negativePrompt,
            model: dto.model,
            referenceData: dto.referenceData,
          }),
        ) as Prisma.InputJsonValue,
        status: RequestStatus.PENDING,
      },
    });

    try {
      // Map reference data to reference images format expected by Vertex AI
      const referenceImages = this.mapReferenceDataToReferenceImages(dto.referenceData || []);

      // Call Vertex AI service
      const result = await this.vertexAiService.generateImage({
        prompt: dto.prompt,
        sampleCount: dto.sampleCount,
        aspectRatio: dto.aspectRatio,
        negativePrompt: dto.negativePrompt,
        referenceImages,
        modelId: dto.model,
      });

      // Handle multiple results
      const predictions = result?.predictions || [];
      const mediaResults = [];

      for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i];
        const gcsUri = prediction?.gcsUri || '';

        if (gcsUri) {
          try {
            // Store the raw GCS URI in the database
            const mediaResult = await this.prisma.mediaResult.create({
              data: {
                mediaGenerationId: mediaGeneration.id,
                resultUrl: gcsUri, // Store the GCS URI directly
                metadata: {
                  index: i,
                  mimeType: prediction.mimeType || 'image/png',
                  prompt: prediction.prompt || dto.prompt,
                },
              },
            });
            mediaResults.push(mediaResult);
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error creating media result';
            this.logger.error(`Failed to create media result for ${gcsUri}: ${errorMessage}`);
            throw new Error(`Failed to create media result: ${errorMessage}`);
          }
        }
      }

      if (mediaResults.length === 0) {
        throw new Error('No valid results returned from AI service');
      }

      // Update the generation record with success status
      const updatedGeneration = await this.prisma.mediaGeneration.update({
        where: { id: mediaGeneration.id },
        data: {
          status: RequestStatus.SUCCEEDED,
        },
        include: {
          results: true,
        },
      });

      // Convert GCS URIs to signed URLs only for the response
      if (updatedGeneration.results && updatedGeneration.results.length > 0) {
        updatedGeneration.results = await this.getSignedUrlsForResults(
          updatedGeneration.results,
          true, // Throw errors during image generation
        );
      }

      return new MediaResponseDto(updatedGeneration);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating image: ${errorMessage}`);

      // Update the record with failure status
      await this.prisma.mediaGeneration.update({
        where: { id: mediaGeneration.id },
        data: {
          status: RequestStatus.FAILED,
          errorMessage: errorMessage,
        },
      });

      // Re-throw the error to be handled by the global exception filter
      throw error;
    }
  }

  /**
   * Maps ReferenceDataDto objects to ReferenceImage objects for the Vertex AI API
   * @param referenceData The reference data from the client
   * @returns Array of ReferenceImage objects formatted for Vertex AI
   */
  private mapReferenceDataToReferenceImages(referenceData: ReferenceDataDto[]): ReferenceImage[] {
    if (!referenceData || !referenceData.length) {
      return [];
    }

    return referenceData.map((data) => {
      // Map the reference image config
      const referenceImageConfig: ReferenceImageConfig = {
        gcsUri: data.referenceImage.gcsUri,
        // bytesBase64Encoded: data.referenceImage.bytesBase64Encoded, // We don't need this for now
      };

      // Create the base reference image object
      const baseReferenceImage: ReferenceImage = {
        referenceId: data.referenceId,
        referenceType: this.mapReferenceType(data.referenceType),
        referenceImage: referenceImageConfig,
      };

      // Add specific configs based on reference type
      const vertexAiReferenceType = this.mapReferenceType(data.referenceType);

      switch (vertexAiReferenceType) {
        case ReferenceType.REFERENCE_TYPE_SUBJECT:
          return {
            ...baseReferenceImage,
            subjectImageConfig: {
              subjectType: this.mapSecondaryReferenceTypeToSubjectType(data.secondaryReferenceType),
              imageDescription: data.description || '',
            },
          } as SubjectReferenceImage;

        case ReferenceType.REFERENCE_TYPE_MASK:
          return {
            ...baseReferenceImage,
            maskImageConfig: {
              maskMode: MaskMode.MASK_MODE_USER_PROVIDED, // Default to user provided mask
            },
          } as MaskReferenceImage;

        case ReferenceType.REFERENCE_TYPE_STYLE:
          return {
            ...baseReferenceImage,
            styleImageConfig: {
              styleDescription: data.description || '',
            },
          } as StyleReferenceImage;

        case ReferenceType.REFERENCE_TYPE_CONTROL:
          return {
            ...baseReferenceImage,
            controlImageConfig: {
              controlType: ControlType.CONTROL_TYPE_CANNY, // Default to canny edge
              enableControlImageComputation: true,
            },
          } as ControlReferenceImage;

        default:
          return baseReferenceImage;
      }
    });
  }

  /**
   * Maps application reference type to Vertex AI reference type
   * @param referenceType The reference type from the application
   * @returns The corresponding Vertex AI reference type
   */
  private mapReferenceType(referenceType?: AppReferenceType): ReferenceType {
    // Map the application reference type to Vertex AI reference type
    switch (referenceType) {
      case AppReferenceType.PERSON:
      case AppReferenceType.PRODUCT:
      case AppReferenceType.ANIMAL:
        return ReferenceType.REFERENCE_TYPE_SUBJECT;
      case AppReferenceType.MASK:
        return ReferenceType.REFERENCE_TYPE_MASK;
      case AppReferenceType.STYLE:
        return ReferenceType.REFERENCE_TYPE_STYLE;
      case AppReferenceType.CONTROL:
        return ReferenceType.REFERENCE_TYPE_CONTROL;
      case AppReferenceType.RAW:
        return ReferenceType.REFERENCE_TYPE_RAW;
      default:
        return ReferenceType.REFERENCE_TYPE_SUBJECT;
    }
  }

  /**
   * Maps secondary reference type to subject type
   * @param secondaryReferenceType The secondary reference type
   * @returns The corresponding subject type for Vertex AI
   */
  private mapSecondaryReferenceTypeToSubjectType(
    secondaryReferenceType?: SecondaryReferenceType,
  ): SubjectType {
    // Map the application secondary reference type to Vertex AI subject type
    switch (secondaryReferenceType) {
      case SecondaryReferenceType.SUBJECT_TYPE_PERSON:
        return SubjectType.SUBJECT_TYPE_PERSON;
      case SecondaryReferenceType.SUBJECT_TYPE_PRODUCT:
        return SubjectType.SUBJECT_TYPE_PRODUCT;
      case SecondaryReferenceType.SUBJECT_TYPE_ANIMAL:
        return SubjectType.SUBJECT_TYPE_ANIMAL;
      default:
        return SubjectType.SUBJECT_TYPE_DEFAULT;
    }
  }

  async generateVideoAsync(userId: string, dto: VideoGenerationDto): Promise<string> {
    const jobData: InitiateVideoGenerationJobData = {
      userId,
      projectId: dto.projectId,
      prompt: dto.prompt,
      operationId: uuidv4(),
      parameters: {
        negativePrompt: dto.negativePrompt,
        durationSeconds: dto.durationSeconds,
        aspectRatio: dto.aspectRatio,
        enhancePrompt: dto.enhancePrompt,
        sampleCount: dto.sampleCount,
        model: dto.model,
        seed: dto.seed,
        referenceImage: dto.referenceImage,
      },
    };

    await this.mediaQueue.add(MediaGenerationJob.INITIATE_VIDEO_GENERATION, jobData);
    return jobData.operationId;
  }

  async getVideoGenerationResults(userId: string, operationId: string): Promise<MediaResponseDto> {
    const mediaResponse = await this.prisma.mediaGeneration.findFirst({
      where: { userId, operationId },
      include: {
        results: true,
      },
    });

    if (!mediaResponse) {
      throw new NotFoundException('Media generation not found');
    }

    if (mediaResponse.results && mediaResponse.results.length > 0) {
      mediaResponse.results = await this.getSignedUrlsForResults(mediaResponse.results);
    }

    return new MediaResponseDto(mediaResponse);
  }

  async generateMusic(userId: string, dto: MusicGenerationDto): Promise<MediaResponseDto> {
    // Validate project exists
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Create a record of the request with PENDING status
    const mediaGeneration = await this.prisma.mediaGeneration.create({
      data: {
        userId,
        projectId: dto.projectId,
        mediaType: MediaType.MUSIC,
        prompt: dto.prompt,
        parameters: {
          durationSeconds: dto.durationSeconds,
          genre: dto.genre,
          instrument: dto.instrument,
          tempo: dto.tempo,
          seed: dto.seed,
        },
        status: RequestStatus.PENDING,
      },
    });

    try {
      // Call Vertex AI service
      const result = await this.vertexAiService.generateMusic({
        prompt: dto.prompt,
        sampleCount: 1,
        duration: dto.durationSeconds,
      });

      // Handle results
      const predictions = result?.predictions || [];
      const mediaResults = [];

      for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i];
        const gcsUri = prediction?.gcsUri || '';

        if (gcsUri) {
          try {
            // Store the raw GCS URI in the database
            const mediaResult = await this.prisma.mediaResult.create({
              data: {
                mediaGenerationId: mediaGeneration.id,
                resultUrl: gcsUri, // Store the GCS URI directly
                metadata: {
                  index: i,
                  mimeType: prediction.mimeType || 'audio/mp3',
                  prompt: prediction.prompt || dto.prompt,
                  durationSeconds: dto.durationSeconds,
                  genre: dto.genre,
                },
              },
            });
            mediaResults.push(mediaResult);
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error creating media result';
            this.logger.error(`Failed to create media result for ${gcsUri}: ${errorMessage}`);
            throw new Error(`Failed to create media result: ${errorMessage}`);
          }
        }
      }

      if (mediaResults.length === 0) {
        throw new Error('No valid results returned from AI service');
      }

      // Update the generation record with success status
      const updatedGeneration = await this.prisma.mediaGeneration.update({
        where: { id: mediaGeneration.id },
        data: {
          status: RequestStatus.SUCCEEDED,
        },
        include: {
          results: true,
        },
      });

      // Convert GCS URIs to signed URLs only for the response
      if (updatedGeneration.results && updatedGeneration.results.length > 0) {
        updatedGeneration.results = await this.getSignedUrlsForResults(
          updatedGeneration.results,
          true,
        );
      }

      return new MediaResponseDto(updatedGeneration);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating music: ${errorMessage}`);

      // Update the record with failure status
      await this.prisma.mediaGeneration.update({
        where: { id: mediaGeneration.id },
        data: {
          status: RequestStatus.FAILED,
          errorMessage: errorMessage,
        },
      });

      // Re-throw the error to be handled by the global exception filter
      throw error;
    }
  }

  async generateAudio(userId: string, dto: AudioGenerationDto): Promise<MediaResponseDto> {
    // Validate project exists
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Create a record of the request with PENDING status
    const mediaGeneration = await this.prisma.mediaGeneration.create({
      data: {
        userId,
        projectId: dto.projectId,
        mediaType: MediaType.AUDIO,
        prompt: dto.prompt,
        parameters: {
          durationSeconds: dto.durationSeconds,
          audioStyle: dto.audioStyle,
          seed: dto.seed,
        },
        status: RequestStatus.PENDING,
      },
    });

    try {
      // Call Vertex AI service
      const result = await this.vertexAiService.synthesizeAndStoreSpeech({
        text: dto.prompt,
        voice: dto.audioStyle || 'en-US-Standard-A',
      });

      // Create media result from stored speech
      const mediaResult = await this.prisma.mediaResult.create({
        data: {
          mediaGenerationId: mediaGeneration.id,
          resultUrl: result.audioUrl,
          metadata: {
            mimeType: 'audio/mp3',
            prompt: dto.prompt,
            durationSeconds: dto.durationSeconds,
            voice: dto.audioStyle,
            filePath: result.filePath,
          },
        },
      });

      this.logger.debug(`Created audio result: ${mediaResult.id}`);

      // Update the generation record with success status
      const updatedGeneration = await this.prisma.mediaGeneration.update({
        where: { id: mediaGeneration.id },
        data: {
          status: RequestStatus.SUCCEEDED,
        },
        include: {
          results: true,
        },
      });

      return new MediaResponseDto(updatedGeneration);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating audio: ${errorMessage}`);

      // Update the record with failure status
      await this.prisma.mediaGeneration.update({
        where: { id: mediaGeneration.id },
        data: {
          status: RequestStatus.FAILED,
          errorMessage: errorMessage,
        },
      });

      // Re-throw the error to be handled by the global exception filter
      throw error;
    }
  }

  async getMediaRequestById(id: string, userId: string): Promise<MediaResponseDto> {
    const mediaGeneration = await this.prisma.mediaGeneration.findUnique({
      where: { id, userId },
      include: {
        results: true,
      },
    });

    if (!mediaGeneration) {
      throw new NotFoundException('Media request not found');
    }

    // Convert GCS URIs to signed URLs in results for response
    if (mediaGeneration.results && mediaGeneration.results.length > 0) {
      mediaGeneration.results = await this.getSignedUrlsForResults(mediaGeneration.results);
    }

    return new MediaResponseDto(mediaGeneration);
  }

  async getMediaHistory(
    userId: string,
    query: MediaHistoryQueryDto,
  ): Promise<PaginatedResponse<MediaResponseDto>> {
    const { page = 1, limit = 10, mediaType, status, search, projectId } = query;
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: Prisma.MediaGenerationWhereInput = { userId };

    if (mediaType) {
      where.mediaType = mediaType;
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (search) {
      where.prompt = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Get media generations with results
    const [mediaGenerations, total] = await Promise.all([
      this.prisma.mediaGeneration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          results: true,
        },
      }),
      this.prisma.mediaGeneration.count({ where }),
    ]);

    // Process each media generation to convert GCS URIs to signed URLs in results for response
    for (const mediaGeneration of mediaGenerations) {
      if (mediaGeneration.results && mediaGeneration.results.length > 0) {
        mediaGeneration.results = await this.getSignedUrlsForResults(mediaGeneration.results);
      }
    }

    const data = mediaGenerations.map((item) => new MediaResponseDto(item));
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  /**
   * Convert GCS URIs to signed URLs in media results
   * @param results Array of MediaResult objects that may contain GCS URIs
   * @param throwOnError When true, rethrow errors instead of silently keeping original URLs
   * @returns Array of MediaResult objects with signed URLs
   */
  async getSignedUrlsForResults(
    results: MediaResult[],
    throwOnError = false,
  ): Promise<MediaResult[]> {
    // Create a copy of the results to avoid modifying the original objects
    const updatedResults = [...results];

    for (let i = 0; i < updatedResults.length; i++) {
      const result = updatedResults[i];

      // Check if the result URL is a GCS URI (starts with gs://)
      if (result.resultUrl.startsWith('gs://')) {
        try {
          // Generate a signed URL for response
          const signedUrl = await this.googleCloudService.createSignedUrl(result.resultUrl);

          // Create a new metadata object to avoid modifying the original
          const metadata = { ...((result.metadata as Record<string, any>) || {}) };

          // Store the original GCS URI in metadata
          metadata.originalGcsUri = result.resultUrl;

          // Update the result with the signed URL for response
          updatedResults[i] = {
            ...result,
            resultUrl: signedUrl,
            metadata: metadata,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to generate signed URL for ${result.resultUrl}: ${errorMessage}`,
          );

          if (throwOnError) {
            throw error; // Propagate the error if requested
          }
          // Otherwise keep the original URL if signing fails
        }
      }
    }

    return updatedResults;
  }

  /**
   * Initiate video generation asynchronously
   * @param userId User ID
   * @param projectId Project ID
   * @param prompt Video generation prompt
   * @param parameters Video generation parameters
   * @returns Operation name for tracking the generation
   */
  async initiateVideoGeneration(
    userId: string,
    projectId: string,
    prompt: string,
    parameters: VideoGenerationJobParameters,
    operationId: string,
  ): Promise<string> {
    this.logger.debug(`Initiating async video generation for user ${userId}`);

    // Validate project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Create a record of the request with PROCESSING status
    const mediaGeneration = await this.prisma.mediaGeneration.create({
      data: {
        userId,
        projectId,
        operationId,
        mediaType: MediaType.VIDEO,
        prompt,
        parameters: {
          ...parameters,
        },
        status: RequestStatus.PROCESSING,
      },
    });

    try {
      // Prepare image configuration if a reference image is provided
      let image;
      if (parameters.referenceImage) {
        image = {
          gcsUri: parameters.referenceImage.gcsUri,
          bytesBase64Encoded: parameters.referenceImage.bytesBase64Encoded,
        };
      }

      // Call Vertex AI service to initiate generation
      const operationName = await this.vertexAiService.initiateVideoGeneration({
        prompt,
        sampleCount: parameters.sampleCount || 1,
        durationSeconds: parameters.durationSeconds || 1,
        aspectRatio: parameters.aspectRatio || '16:9',
        negativePrompt: parameters.negativePrompt || '',
        image,
        modelId: parameters.model,
      });

      // Update the generation record with the operation name
      await this.prisma.mediaGeneration.update({
        where: { id: mediaGeneration.id },
        data: {
          parameters: {
            ...parameters,
            operationName,
          },
        },
      });

      this.logger.debug(`Video generation initiated with operation: ${operationName}`);
      return operationName;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error initiating video generation: ${errorMessage}`);

      // Update the record with failure status
      await this.prisma.mediaGeneration.update({
        where: { id: mediaGeneration.id },
        data: {
          status: RequestStatus.FAILED,
          errorMessage: errorMessage,
        },
      });

      // Re-throw the error
      throw error;
    }
  }

  /**
   * Check the status of a video generation operation
   * @param operationName The name of the operation to check
   * @returns Operation status with response if completed
   */
  async checkVideoGenerationStatus(operationName: string): Promise<OperationResponse> {
    this.logger.debug(`Checking status of operation: ${operationName}`);
    return this.vertexAiService.checkVideoGenerationStatus(operationName);
  }

  /**
   * Handle completed video generation
   * @param userId User ID
   * @param operationName Operation name
   * @param response Operation response
   */
  async handleCompletedVideoGeneration(
    userId: string,
    operationName: string,
    videoPredictions: VeoPrediction[],
  ): Promise<void> {
    this.logger.debug(`Handling completed video generation: ${operationName}`);

    // Find the media generation record by operation name
    const mediaGeneration = await this.prisma.mediaGeneration.findFirst({
      where: {
        userId,
        parameters: {
          path: ['operationName'],
          equals: operationName,
        },
      },
    });

    if (!mediaGeneration) {
      this.logger.error(`Media generation record not found for operation: ${operationName}`);
      return;
    }

    try {
      // Process the response
      const predictions = videoPredictions;
      const mediaResults = [];

      for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i];
        const gcsUri = prediction?.gcsUri || '';

        if (gcsUri) {
          try {
            // Store the raw GCS URI in the database
            const mediaResult = await this.prisma.mediaResult.create({
              data: {
                mediaGenerationId: mediaGeneration.id,
                resultUrl: gcsUri, // Store the GCS URI directly
                metadata: {
                  index: i,
                  mimeType: prediction.mimeType || 'video/mp4',
                  prompt: prediction.prompt || mediaGeneration.prompt,
                },
              },
            });
            mediaResults.push(mediaResult);
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error creating media result';
            this.logger.error(`Failed to create media result for ${gcsUri}: ${errorMessage}`);
            throw new Error(`Failed to create media result: ${errorMessage}`);
          }
        }
      }

      if (mediaResults.length === 0) {
        throw new Error('No valid results returned from AI service');
      }

      // Update the generation record with success status
      await this.prisma.mediaGeneration.update({
        where: { id: mediaGeneration.id },
        data: {
          status: RequestStatus.SUCCEEDED,
        },
      });

      this.logger.debug(`Video generation completed successfully: ${operationName}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing completed video generation: ${errorMessage}`);

      // Update the record with failure status
      await this.prisma.mediaGeneration.update({
        where: { id: mediaGeneration.id },
        data: {
          status: RequestStatus.FAILED,
          errorMessage: errorMessage,
        },
      });
    }
  }

  async upscaleImage(userId: string, dto: ImageUpscaleDto): Promise<MediaResponseDto> {
    // Validate project exists
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Create a record of the request with PENDING status
    const mediaGeneration = await this.prisma.mediaGeneration.create({
      data: {
        userId,
        projectId: dto.projectId,
        mediaType: MediaType.IMAGE,
        prompt: 'Image Upscaling', // No prompt for upscaling
        parameters: JSON.parse(
          JSON.stringify({
            upscaleFactor: dto.upscaleFactor,
            gcsUri: dto.gcsUri,
          }),
        ) as Prisma.InputJsonValue,
        status: RequestStatus.PENDING,
      },
    });

    try {
      // Call Vertex AI service
      const result = await this.vertexAiService.upscaleImage({
        gcsUri: dto.gcsUri,
        upscaleFactor: dto.upscaleFactor,
      });

      // Handle results - should only have one result for upscaling
      const predictions = result?.predictions || [];
      const mediaResults = [];

      for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i];
        const gcsUri = prediction?.gcsUri || '';

        if (gcsUri) {
          // Store the GCS URI directly
          const mediaResult = await this.prisma.mediaResult.create({
            data: {
              mediaGenerationId: mediaGeneration.id,
              resultUrl: gcsUri,
              metadata: {
                index: i,
                mimeType: prediction.mimeType || 'image/png',
                isUpscaled: true,
                upscaleFactor: dto.upscaleFactor,
              },
            },
          });
          mediaResults.push(mediaResult);
        }
      }

      if (mediaResults.length === 0) {
        throw new Error('No valid results returned from AI service');
      }

      // Update the generation record with success status
      const updatedGeneration = await this.prisma.mediaGeneration.update({
        where: { id: mediaGeneration.id },
        data: {
          status: RequestStatus.SUCCEEDED,
        },
        include: {
          results: true,
        },
      });

      // Convert GCS URIs to signed URLs only for the response
      if (updatedGeneration.results && updatedGeneration.results.length > 0) {
        updatedGeneration.results = await this.getSignedUrlsForResults(
          updatedGeneration.results,
          true, // Throw errors during image upscaling
        );
      }

      return new MediaResponseDto(updatedGeneration);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error upscaling image: ${errorMessage}`);

      // Update the record with failure status
      await this.prisma.mediaGeneration.update({
        where: { id: mediaGeneration.id },
        data: {
          status: RequestStatus.FAILED,
          errorMessage: errorMessage,
        },
      });

      // Re-throw the error to be handled by the global exception filter
      throw error;
    }
  }
}
