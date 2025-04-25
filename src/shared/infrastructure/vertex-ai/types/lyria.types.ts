import { BaseRequest, BaseResponse } from './models.types';

export interface LyriaInstance {
  prompt: string;
  audioReference?: {
    bytesBase64Encoded: string;
    mimeType?: string;
  };
}

export interface LyriaParameters {
  sampleCount?: number;
  continuationDuration?: number;
  sampleRate?: number;
  duration?: number;
  outputFormat?: 'mp3' | 'wav';
  qualityScore?: number;
  storageUri?: string;
}

export type LyriaRequest = BaseRequest<LyriaInstance, LyriaParameters>;

export interface LyriaPrediction {
  mimeType?: string;
  gcsUri?: string;
  prompt?: string;
  bytesBase64Encoded?: string;
  safetyAttributes?: LyriaSafetyAttributes;
}

export interface LyriaSafetyAttributes {
  categories: string[];
  scores: number[];
}

export type LyriaResponse = BaseResponse<LyriaPrediction>;
