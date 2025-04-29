import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GoogleCloudService } from '../../google-cloud/google-cloud.service';
import { ImagenApiError } from '../vertex-ai.errors';
import {
  ImageGenerationParams,
  ImageUpscaleParams,
} from '../interfaces/generation-params.interface';
import {
  ImagenRequest,
  ImagenResponse,
  ImagenInstance,
  ImagenParameters,
  ImagenUpscaleConfig,
} from '../types/imagen.types';
import { ImageGenerationModel } from '../../../../modules/media/types/media.types';

@Injectable()
export class ImagenService {
  private readonly logger = new Logger(ImagenService.name);
  private readonly location: string;
  private readonly projectId: string;
  private readonly defaultModelId: string;
  private readonly upscaleModelId: string = 'imagegeneration@002';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly googleCloudService: GoogleCloudService,
  ) {
    this.location = this.configService.get<string>('VERTEX_AI_LOCATION', 'us-central1');
    this.projectId = this.configService.get<string>('VERTEX_AI_PROJECT_ID', 'default_project_id');
    this.defaultModelId = this.configService.get<string>(
      'VERTEX_AI_IMAGEN_MODEL_ID',
      ImageGenerationModel.IMAGEN_3,
    );
  }

  /**
   * Generate an image using the Imagen model
   * @param params Parameters for image generation
   * @returns Image generation response
   */
  async generateImage(params: ImageGenerationParams): Promise<ImagenResponse> {
    try {
      const {
        prompt,
        sampleCount = 1,
        aspectRatio,
        negativePrompt,
        referenceImages,
        modelId,
        ...rest
      } = params;

      // Determine which model to use
      let selectedModelId = this.defaultModelId;

      // If model is explicitly provided in the request, use that
      if (modelId) {
        selectedModelId = modelId;
      }
      // If reference images are provided, use the capability model if not overridden
      else if (referenceImages && referenceImages.length > 0) {
        selectedModelId = ImageGenerationModel.IMAGEN_3_CAPABILITY;
      }

      this.logger.debug(`Using model: ${selectedModelId} for image generation`);

      // Create instances array - only include referenceImages if they exist
      const instancePayload: ImagenInstance = { prompt };
      if (referenceImages && referenceImages.length > 0) {
        instancePayload.referenceImages = referenceImages;
      }

      const instances: ImagenInstance[] = [instancePayload];

      // Create parameters object
      const parameters: ImagenParameters = {
        sampleCount,
        aspectRatio,
        negativePrompt,
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
      return await this.callVertexAiApi(payload, selectedModelId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error generating image: ${errorMessage}`, errorStack);
      throw new ImagenApiError('Failed to generate image', error);
    }
  }

  /**
   * Upscale an image using the imagegeneration@002 model
   * @param params Parameters for image upscaling
   * @returns Upscaled image response
   */
  async upscaleImage(params: ImageUpscaleParams): Promise<ImagenResponse> {
    try {
      const { upscaleFactor, gcsUri, modelId = this.upscaleModelId } = params;

      this.logger.debug(`Using model: ${modelId} for image upscaling with source: ${gcsUri}`);

      // Create instance with empty prompt and image source
      const instances: ImagenInstance[] = [
        {
          prompt: '', // Empty prompt for upscaling
          image: {
            gcsUri,
          },
        },
      ];

      // Create parameters object for upscaling
      const upscaleConfig: ImagenUpscaleConfig = {
        upscaleFactor: upscaleFactor || 'x2',
      };

      const parameters: ImagenParameters = {
        sampleCount: 1,
        mode: 'upscale' as const,
        upscaleConfig,
        storageUri: this.configService.get<string>(
          'VERTEX_AI_STORAGE_URI',
          'gs://bucket-name/path/to/image.png',
        ),
      };

      // Call the model
      const payload: ImagenRequest = { instances, parameters };
      const response = await this.callVertexAiApi(payload, modelId);
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error upscaling image: ${errorMessage}`, errorStack);
      throw new ImagenApiError('Failed to upscale image', error);
    }
  }

  /**
   * Call the Vertex AI API for Imagen
   * @param payload Request payload
   * @param modelId The model ID to use
   * @returns API response
   */
  private async callVertexAiApi(
    payload: ImagenRequest,
    modelId: string = this.defaultModelId,
  ): Promise<ImagenResponse> {
    try {
      // Get access token
      const accessToken = await this.googleCloudService.getAccessToken();

      // Get model endpoint
      const endpoint = this.getModelEndpoint(modelId);

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
   * @param modelId The model ID to use
   * @returns Full URL endpoint for the Imagen API
   */
  private getModelEndpoint(modelId: string = this.defaultModelId): string {
    const predictType = 'predict';
    return `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelId}:${predictType}`;
  }
}
