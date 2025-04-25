import { HttpStatus } from '@nestjs/common';
import { ModelType } from './types/models.types';

export class VertexAiApiError extends Error {
  readonly status: number;
  readonly modelType?: ModelType;
  code: string;

  constructor(message: string, originalError?: unknown, modelType?: ModelType) {
    const errorMessage = originalError instanceof Error ? originalError.message : 'Unknown error';
    super(`${message}: ${errorMessage}`);
    this.name = 'VertexAiApiError';
    this.modelType = modelType;
    this.status = HttpStatus.BAD_GATEWAY;
    this.code = 'VERTEX_AI_ERROR';

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ImagenApiError extends VertexAiApiError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError, ModelType.IMAGE);
    this.name = 'ImagenApiError';
    this.code = 'IMAGEN_API_ERROR';
  }
}

export class VeoApiError extends VertexAiApiError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError, ModelType.VIDEO);
    this.name = 'VeoApiError';
    this.code = 'VEO_API_ERROR';
  }
}

export class LyriaApiError extends VertexAiApiError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError, ModelType.MUSIC);
    this.name = 'LyriaApiError';
    this.code = 'LYRIA_API_ERROR';
  }
}

export class ChirpApiError extends VertexAiApiError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError, ModelType.SPEECH);
    this.name = 'ChirpApiError';
    this.code = 'CHIRP_API_ERROR';
  }
}
