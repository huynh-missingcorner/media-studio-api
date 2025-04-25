export enum ModelType {
  IMAGE = 'image',
  VIDEO = 'video',
  MUSIC = 'music',
  SPEECH = 'speech',
}

export interface ModelConfig {
  modelId: string;
  type: ModelType;
  defaultModelParams?: Record<string, unknown>;
}

export interface VertexAiModels {
  imagen: ModelConfig;
  veo: ModelConfig;
  lyria: ModelConfig;
  chirp: ModelConfig;
}

export interface VertexAiModelOptions {
  location?: string;
  modelId?: string;
  projectId?: string;
}

export interface BaseRequest<T = unknown, P = unknown> {
  instances: T[];
  parameters?: P;
}

export interface BaseResponse<T = unknown> {
  predictions: T[];
}
