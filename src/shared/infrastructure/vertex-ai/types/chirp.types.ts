import { BaseRequest, BaseResponse } from './models.types';

export interface ChirpInstance {
  text: string;
  voice?: string;
}

export interface ChirpParameters {
  sampleCount?: number;
  sampleRate?: number;
  speed?: number;
  voiceType?: string;
  outputFormat?: 'mp3' | 'wav';
  language?: string;
  pitch?: number;
  storageUri?: string;
}

export type ChirpRequest = BaseRequest<ChirpInstance, ChirpParameters>;

export interface ChirpPrediction {
  mimeType?: string;
  gcsUri?: string;
  prompt?: string;
  bytesBase64Encoded?: string;
  safetyAttributes?: ChirpSafetyAttributes;
}

export interface ChirpSafetyAttributes {
  categories: string[];
  scores: number[];
}

export type ChirpResponse = BaseResponse<ChirpPrediction>;

export interface StoredSpeechResponse {
  audioUrl: string;
  filePath: string;
}
