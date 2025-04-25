import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { MEDIA_GENERATION_QUEUE, MediaGenerationJob } from '../queues/media-generation.queue';
import { MediaService } from '../media.service';
import {
  InitiateVideoGenerationJobData,
  PollVideoGenerationJobData,
} from '../types/video-generation-job.types';
const MAX_POLLING_ATTEMPTS = 20;
const POLLING_INTERVAL = 5000; // 5 seconds

@Injectable()
@Processor(MEDIA_GENERATION_QUEUE)
export class MediaGenerationProcessor {
  private readonly logger = new Logger(MediaGenerationProcessor.name);

  constructor(
    private readonly mediaService: MediaService,
    @InjectQueue(MEDIA_GENERATION_QUEUE) private readonly mediaQueue: Queue,
  ) {}

  @Process(MediaGenerationJob.INITIATE_VIDEO_GENERATION)
  async handleInitiateVideoGeneration(job: Job<InitiateVideoGenerationJobData>): Promise<void> {
    this.logger.debug(`Processing ${MediaGenerationJob.INITIATE_VIDEO_GENERATION} job ${job.id}`);
    const { userId, projectId, prompt, parameters, operationId } = job.data;

    try {
      // Initiate video generation and get the operation name
      const operationName = await this.mediaService.initiateVideoGeneration(
        userId,
        projectId,
        prompt,
        parameters,
        operationId,
      );

      this.logger.debug(`Video generation initiated with operation: ${operationName}`);

      // Add a job to poll for the operation's completion
      await this.mediaQueue.add(
        MediaGenerationJob.POLL_VIDEO_GENERATION,
        {
          userId,
          operationName,
          retryCount: 0,
        },
        {
          delay: POLLING_INTERVAL,
        },
      );

      this.logger.debug(`Polling job added for operation: ${operationName}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error processing video generation job: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Error processing video generation job.`, error);
      }
      throw error;
    }
  }

  @Process(MediaGenerationJob.POLL_VIDEO_GENERATION)
  async handlePollVideoGeneration(job: Job<PollVideoGenerationJobData>): Promise<void> {
    this.logger.debug(`Processing ${MediaGenerationJob.POLL_VIDEO_GENERATION} job ${job.id}`);
    const { userId, operationName, retryCount } = job.data;

    // Check if we've reached the maximum polling attempts
    if (retryCount >= MAX_POLLING_ATTEMPTS) {
      const errorMessage = `Maximum polling attempts reached for operation: ${operationName}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      // Check the status of the video generation operation
      const operationStatus = await this.mediaService.checkVideoGenerationStatus(operationName);

      if (operationStatus.done) {
        this.logger.debug(`Operation ${operationName} completed`);
        // Process the completed operation result
        if (operationStatus.error) {
          this.logger.error(`Operation error: ${JSON.stringify(operationStatus.error)}`);
        } else {
          // Handle successful completion (store results, notify user, etc.)
          this.logger.debug(`Operation successful: ${JSON.stringify(operationStatus.response)}`);
          await this.mediaService.handleCompletedVideoGeneration(
            userId,
            operationName,
            operationStatus.response?.videos || [],
          );
        }
      } else {
        this.logger.debug(`Operation ${operationName} still in progress, retry ${retryCount + 1}`);
        // If not completed, add another polling job
        await this.mediaQueue.add(
          MediaGenerationJob.POLL_VIDEO_GENERATION,
          {
            userId,
            operationName,
            retryCount: retryCount + 1,
          },
          {
            delay: POLLING_INTERVAL,
          },
        );
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Error polling video generation operation: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(`Error polling video generation operation.`, error);
      }
      throw error;
    }
  }
}
