import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GoogleCloudService } from '../../google-cloud/google-cloud.service';
import { LyriaApiError } from '../vertex-ai.errors';
import { MusicGenerationParams } from '../interfaces/generation-params.interface';
import { LyriaRequest, LyriaResponse, LyriaInstance, LyriaParameters } from '../types/lyria.types';

@Injectable()
export class LyriaService {
  private readonly logger = new Logger(LyriaService.name);
  private readonly location: string;
  private readonly projectId: string;
  private readonly modelId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly googleCloudService: GoogleCloudService,
  ) {
    this.location = this.configService.get<string>('VERTEX_AI_LOCATION', 'us-central1');
    this.projectId = this.configService.get<string>('VERTEX_AI_PROJECT_ID', 'default_project_id');
    this.modelId = this.configService.get<string>('VERTEX_AI_LYRIA_MODEL_ID', 'lyria-1.0-generate');
  }

  /**
   * Generate music using the Lyria model
   * @param params Parameters for music generation
   * @returns Music generation response
   */
  async generateMusic(params: MusicGenerationParams): Promise<LyriaResponse> {
    try {
      const { prompt, sampleCount = 1, audioReference, ...rest } = params;

      // Set a sensible minimum duration that reduces costs while still being useful
      const duration = params.duration || 1;

      // Create instances array
      const instances: LyriaInstance[] = [{ prompt, audioReference }];

      // Create parameters object
      const parameters: LyriaParameters = {
        sampleCount,
        duration,
        storageUri:
          rest.storageUri ||
          this.configService.get<string>(
            'VERTEX_AI_STORAGE_URI',
            'gs://bucket-name/path/to/music.wav',
          ),
        ...rest,
      };

      // Call the model
      const payload: LyriaRequest = { instances, parameters };
      return await this.callVertexAiApi(payload);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error generating music: ${errorMessage}`, errorStack);
      throw new LyriaApiError('Failed to generate music', error);
    }
  }

  /**
   * Call the Vertex AI API for Lyria
   * @param payload Request payload
   * @returns API response
   */
  private async callVertexAiApi(payload: LyriaRequest): Promise<LyriaResponse> {
    try {
      // Get access token
      const accessToken = await this.googleCloudService.getAccessToken();

      // Get model endpoint
      const endpoint = this.getModelEndpoint();

      // Make API call
      const response = await firstValueFrom(
        this.httpService.post(endpoint, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      if (!response.data) {
        throw new LyriaApiError('No data returned from Lyria API', undefined);
      }

      return response.data as LyriaResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error calling Lyria API: ${errorMessage}`, errorStack);
      throw new LyriaApiError(`Failed to call Lyria API`, error);
    }
  }

  /**
   * Get the endpoint URL for Lyria
   * @returns Full URL endpoint for the Lyria API
   */
  private getModelEndpoint(): string {
    const predictType = 'predict';
    return `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelId}:${predictType}`;
  }
}
