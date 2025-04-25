import { BaseRequest, BaseResponse } from './models.types';

export interface ImagenInstance {
  prompt: string;
  image?: {
    bytesBase64Encoded: string; // for inpainting or outpainting
    mimeType?: string;
  };
  mask?: {
    bytesBase64Encoded: string;
    mimeType?: string;
  };
}

export interface ImagenParameters {
  sampleCount?: number;
  negativePrompt?: string;
  enhancePrompt?: boolean;
  seed?: number;
  guidanceScale?: number;
  outputMimeType?: 'image/png' | 'image/jpeg';
  aspectRatio?: '1:1' | '16:9' | '3:2' | '4:3' | '9:16' | '2:3' | '3:4';
  responseMimeType?: 'application/json' | 'application/x-protobuf';
  sampleImageStyle?: string;
  personGeneration?: string;
  promptLanguage?: string;
  safetySetting?: string;
  addWatermark?: boolean;
  includeRaiReason?: boolean;
  outputOptions?: ImagenOutputOptions;
  storageUri?: string;
  upscaleConfig?: ImagenUpscaleConfig;
}

export interface ImagenOutputOptions {
  mimeType?: string;
  compressionQuality?: number;
}

export interface ImagenUpscaleConfig {
  upscaleFactor: string;
}

export type ImagenRequest = BaseRequest<ImagenInstance, ImagenParameters>;

export interface ImagenPrediction {
  mimeType?: string;
  gcsUri?: string;
  prompt?: string;
  bytesBase64Encoded?: string;
  raiFilteredReason?: string;
  safetyAttributes?: ImagenSafetyAttributes;
}

export interface ImagenSafetyAttributes {
  categories: string[];
  scores: number[];
}

export type ImagenResponse = BaseResponse<ImagenPrediction>;
