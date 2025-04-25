import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GoogleCloudService } from '../../google-cloud/google-cloud.service';
import { VeoApiError } from '../vertex-ai.errors';
import { VideoGenerationParams } from '../interfaces/generation-params.interface';
import {
  VeoRequest,
  VeoInstance,
  VeoParameters,
  OperationResponse,
  FetchPredictOperationRequest,
} from '../types/veo.types';

@Injectable()
export class VeoService {
  private readonly logger = new Logger(VeoService.name);
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
    this.modelId = this.configService.get<string>('VERTEX_AI_VEO_MODEL_ID', 'veo-2.0-generate-001');
  }

  /**
   * Initiate a video generation and return the operation name
   * @param params Parameters for video generation
   * @returns Operation name for long-running operation
   */
  async initiateVideoGeneration(params: VideoGenerationParams): Promise<string> {
    try {
      const { prompt, sampleCount = 1, ...rest } = params;

      // Create instances array
      const instances: VeoInstance[] = [{ prompt }];

      // Create parameters object
      const parameters: VeoParameters = {
        sampleCount,
        storageUri:
          rest.storageUri ||
          this.configService.get<string>(
            'VERTEX_AI_STORAGE_URI',
            'gs://bucket-name/path/to/video.mp4',
          ),
        ...rest,
      };

      // Call the model
      const payload: VeoRequest = { instances, parameters };
      const response = await this.callVertexAiInitiate(payload);

      if (!response.name) {
        throw new VeoApiError('No operation name returned from Veo API', undefined);
      }

      return response.name;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error initiating video generation: ${errorMessage}`, errorStack);
      throw new VeoApiError('Failed to initiate video generation', error);
    }
  }

  /**
   * Check the status of a long-running operation
   * @param operationName The name of the operation to check
   * @returns Operation status response
   */
  async checkOperationStatus(operationName: string): Promise<OperationResponse> {
    try {
      // Get access token
      const accessToken = await this.googleCloudService.getAccessToken();

      // Get operation endpoint
      const endpoint = this.getOperationEndpoint();

      const payload: FetchPredictOperationRequest = {
        operationName,
      };

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
        throw new Error('No data returned from operation status check');
      }

      return {
        ...response.data,
        name: operationName, // Ensure name is included
      } as OperationResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error checking operation status: ${errorMessage}`, errorStack);
      throw new VeoApiError('Failed to check operation status', error);
    }
  }

  /**
   * Call the Vertex AI API to initiate a Veo operation
   * @param payload Request payload
   * @returns API operation initiation response
   */
  private async callVertexAiInitiate(payload: VeoRequest): Promise<OperationResponse> {
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
        throw new VeoApiError('No data returned from Veo API', undefined);
      }

      return response.data as OperationResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error calling Veo API: ${errorMessage}`, errorStack);
      throw new VeoApiError(`Failed to call Veo API`, error);
    }
  }

  /**
   * Get the endpoint URL for Veo
   * @returns Full URL endpoint for the Veo API
   */
  private getModelEndpoint(): string {
    // Video generation needs predictLongRunning
    const predictType = 'predictLongRunning';
    return `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelId}:${predictType}`;
  }

  /**
   * Get the endpoint URL for Veo
   * @returns Full URL endpoint for the Veo API
   */
  private getOperationEndpoint(): string {
    const predictType = 'fetchPredictOperation';
    return `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelId}:${predictType}`;
  }
}
