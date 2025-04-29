import { Injectable, Logger } from '@nestjs/common';
import {
  ImageGenerationParams,
  VideoGenerationParams,
  MusicGenerationParams,
  SpeechGenerationParams,
  ImageUpscaleParams,
} from './interfaces/generation-params.interface';
import { ImagenResponse } from './types/imagen.types';
import { OperationResponse } from './types/veo.types';
import { LyriaResponse } from './types/lyria.types';
import { ImagenService } from './services/imagen.service';
import { VeoService } from './services/veo.service';
import { LyriaService } from './services/lyria.service';
import { ChirpService } from './services/chirp.service';
import { StoredSpeechResponse } from './types/chirp.types';

@Injectable()
export class VertexAiService {
  private readonly logger = new Logger(VertexAiService.name);

  constructor(
    private readonly imagenService: ImagenService,
    private readonly veoService: VeoService,
    private readonly lyriaService: LyriaService,
    private readonly chirpService: ChirpService,
  ) {}

  /**
   * Generate an image using the Imagen model
   * @param params Parameters for image generation
   * @returns Image generation response
   */
  async generateImage(params: ImageGenerationParams): Promise<ImagenResponse> {
    this.logger.log(`Generating image with prompt: ${params.prompt}`);
    return this.imagenService.generateImage(params);
  }

  /**
   * Upscale an image using the imagegeneration@002 model
   * @param params Parameters for image upscaling
   * @returns Upscaled image response
   */
  async upscaleImage(params: ImageUpscaleParams): Promise<ImagenResponse> {
    this.logger.log(`Upscaling image from ${params.gcsUri}`);
    return this.imagenService.upscaleImage(params);
  }

  /**
   * Initiate a video generation operation asynchronously
   * @param params Parameters for video generation
   * @returns Operation name that can be used to check status
   */
  async initiateVideoGeneration(params: VideoGenerationParams): Promise<string> {
    this.logger.log(`Initiating video generation with prompt: ${params.prompt}`);
    return this.veoService.initiateVideoGeneration(params);
  }

  /**
   * Check the status of a video generation operation
   * @param operationName The name of the operation to check
   * @returns Operation status with response if completed
   */
  async checkVideoGenerationStatus(operationName: string): Promise<OperationResponse> {
    this.logger.debug(`Checking status of operation: ${operationName}`);
    return this.veoService.checkOperationStatus(operationName);
  }

  /**
   * Generate music using the Lyria model
   * @param params Parameters for music generation
   * @returns Music generation response
   */
  async generateMusic(params: MusicGenerationParams): Promise<LyriaResponse> {
    this.logger.log(`Generating music with prompt: ${params.prompt}`);
    return this.lyriaService.generateMusic(params);
  }

  /**
   * Generate speech using the Chirp model
   * @param text The text to convert to speech
   * @returns Buffer containing the audio data
   */
  async generateSpeech(text: string): Promise<Buffer> {
    this.logger.log(
      `Generating speech with text: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
    );
    return this.chirpService.synthesizeSpeech(text);
  }

  /**
   * Generate speech using the Chirp model and store it in Google Cloud Storage
   * @param text The text to convert to speech
   * @param userId The user ID for organizing the storage
   * @param projectId The project ID for organizing the storage
   * @returns Information about the stored audio file including a signed URL
   */
  async synthesizeAndStoreSpeech(params: SpeechGenerationParams): Promise<StoredSpeechResponse> {
    this.logger.log(
      `Generating and storing speech for text: ${params.text.substring(0, 50)}${params.text.length > 50 ? '...' : ''}`,
    );
    return this.chirpService.synthesizeAndStoreSpeech(params);
  }
}
