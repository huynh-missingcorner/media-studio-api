export interface ImageGenerationParams {
  prompt: string;
  sampleCount?: number;
  negativePrompt?: string;
  enhancePrompt?: boolean;
  seed?: number;
  guidanceScale?: number;
  aspectRatio?: string;
  storageUri?: string;
}

export interface VideoGenerationParams {
  prompt: string;
  sampleCount?: number;
  negativePrompt?: string;
  seed?: number;
  guidanceScale?: number;
  aspectRatio?: string;
  frameRate?: number;
  durationSeconds?: number;
  storageUri?: string;
}

export interface MusicGenerationParams {
  prompt: string;
  sampleCount?: number;
  duration?: number;
  sampleRate?: number;
  continuationDuration?: number;
  audioReference?: {
    bytesBase64Encoded: string;
    mimeType?: string;
  };
  storageUri?: string;
}

export interface SpeechGenerationParams {
  text: string;
  voice?: string;
  encoding?: 'MP3' | 'MULAW' | 'LINEAR16';
  sampleRate?: number;
  speed?: number;
  volume?: number;
  pitch?: number;
  language?: string;
}
