import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GoogleCloudService } from '../../google-cloud/google-cloud.service';
import { ImagenApiError } from '../vertex-ai.errors';
import { ImageGenerationParams } from '../interfaces/generation-params.interface';
import {
  ImagenRequest,
  ImagenResponse,
  ImagenInstance,
  ImagenParameters,
} from '../types/imagen.types';

@Injectable()
export class ImagenService {
  private readonly logger = new Logger(ImagenService.name);
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
    this.modelId = this.configService.get<string>(
      'VERTEX_AI_IMAGEN_MODEL_ID',
      'imagen-3.0-generate-002',
    );
  }

  /**
   * Generate an image using the Imagen model
   * @param params Parameters for image generation
   * @returns Image generation response
   */
  async generateImage(params: ImageGenerationParams): Promise<ImagenResponse> {
    try {
      const { prompt, sampleCount = 1, aspectRatio, ...rest } = params;

      // Create instances array
      const instances: ImagenInstance[] = [{ prompt }];

      // Create parameters object
      const parameters: ImagenParameters = {
        sampleCount,
        aspectRatio,
        storageUri:
          rest.storageUri ||
          this.configService.get<string>(
            'VERTEX_AI_STORAGE_URI',
            'gs://bucket-name/path/to/image.png',
          ),
        ...rest,
      };

      // Call the model
      const payload: ImagenRequest = { instances, parameters };
      return await this.callVertexAiApi(payload);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error generating image: ${errorMessage}`, errorStack);
      throw new ImagenApiError('Failed to generate image', error);
    }
  }

  /**
   * Call the Vertex AI API for Imagen
   * @param payload Request payload
   * @returns API response
   */
  private async callVertexAiApi(payload: ImagenRequest): Promise<ImagenResponse> {
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
        throw new ImagenApiError('No data returned from Imagen API', undefined);
      }

      return response.data as ImagenResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error calling Imagen API: ${errorMessage}`, errorStack);
      throw new ImagenApiError(`Failed to call Imagen API`, error);
    }
  }

  /**
   * Get the endpoint URL for Imagen
   * @returns Full URL endpoint for the Imagen API
   */
  private getModelEndpoint(): string {
    const predictType = 'predict';
    return `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelId}:${predictType}`;
  }
}
