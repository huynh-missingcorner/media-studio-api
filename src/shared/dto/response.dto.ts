import { ApiProperty } from '@nestjs/swagger';

export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface ResponseMeta {
  [key: string]: unknown;
}

export class ApiResponse<T> {
  @ApiProperty({ enum: ResponseStatus, default: ResponseStatus.SUCCESS })
  status: ResponseStatus;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  meta?: ResponseMeta;

  @ApiProperty()
  timestamp: string;

  constructor(partial: Partial<ApiResponse<T>>) {
    Object.assign(this, {
      status: ResponseStatus.SUCCESS,
      message: 'Success',
      timestamp: new Date().toISOString(),
      ...partial,
    });
  }
}

export class ErrorResponse extends ApiResponse<null> {
  @ApiProperty()
  code: string;

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  errors?: Record<string, unknown> | null;

  constructor(partial: Partial<ErrorResponse>) {
    super({
      status: ResponseStatus.ERROR,
      message: 'Error occurred',
      data: null,
      ...partial,
    });

    this.code = partial.code || 'INTERNAL_ERROR';
    this.errors = partial.errors;
  }
}

export function createSuccessResponse<T>(
  data: T,
  message = 'Success',
  meta?: ResponseMeta,
): ApiResponse<T> {
  return new ApiResponse<T>({
    data,
    message,
    meta,
  });
}

export function createErrorResponse(
  message = 'Error occurred',
  code = 'INTERNAL_ERROR',
  errors?: Record<string, unknown> | null,
): ErrorResponse {
  return new ErrorResponse({
    message,
    code,
    errors,
  });
}
