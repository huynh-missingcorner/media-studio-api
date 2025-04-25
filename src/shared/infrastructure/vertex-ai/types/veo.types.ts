import { BaseRequest, BaseResponse } from './models.types';

export interface VeoInstance {
  prompt: string;
}

export interface VeoParameters {
  sampleCount?: number;
  negativePrompt?: string;
  seed?: number;
  guidanceScale?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  outputFormat?: string;
  outputMimeType?: string;
  frameRate?: number;
  durationSeconds?: number;
  storageUri?: string;
  outputOptions?: VeoOutputOptions;
}

export interface VeoOutputOptions {
  mimeType?: string;
  quality?: number;
}

export type VeoRequest = BaseRequest<VeoInstance, VeoParameters>;

export interface VeoPrediction {
  mimeType?: string;
  gcsUri?: string;
  prompt?: string;
  safetyAttributes?: VeoSafetyAttributes;
}

export interface VeoSafetyAttributes {
  categories: string[];
  scores: number[];
}

export type VeoResponse = BaseResponse<VeoPrediction>;

export interface OperationResponse {
  name: string;
  done: boolean;
  response?: {
    '@type': string;
    videos: VeoPrediction[];
  };
  error?: {
    code: number;
    message: string;
    details: any[];
  };
}

export interface FetchPredictOperationRequest {
  operationName: string;
}
