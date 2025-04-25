export interface InitiateVideoGenerationJobData {
  userId: string;
  projectId: string;
  prompt: string;
  parameters: VideoGenerationJobParameters;
  operationId: string;
}

export interface VideoGenerationJobParameters {
  durationSeconds?: number;
  aspectRatio?: string;
  enhancePrompt?: boolean;
  sampleCount?: number;
  model?: string;
  seed?: number;
}

export interface PollVideoGenerationJobData {
  userId: string;
  operationName: string;
  retryCount: number;
}
