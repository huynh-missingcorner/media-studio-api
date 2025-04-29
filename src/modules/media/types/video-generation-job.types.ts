export interface InitiateVideoGenerationJobData {
  userId: string;
  projectId: string;
  prompt: string;
  parameters: VideoGenerationJobParameters;
  operationId: string;
}

export interface VideoGenerationJobParameters {
  durationSeconds?: number;
  negativePrompt?: string;
  aspectRatio?: string;
  enhancePrompt?: boolean;
  sampleCount?: number;
  model?: string;
  seed?: number;
  referenceImage?: {
    gcsUri?: string;
    bytesBase64Encoded?: string;
    mimeType?: string;
  };
}

export interface PollVideoGenerationJobData {
  userId: string;
  operationName: string;
  retryCount: number;
}
