import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

interface HttpExceptionResponse {
  message?: string | string[];
  code?: string;
  errors?: Record<string, unknown>;
}

export class VertexAiApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'VertexAiApiError';
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let errors: Record<string, unknown> | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const typedResponse = exceptionResponse as HttpExceptionResponse;
        message = typedResponse.message?.toString() || message;
        code = typedResponse.code || code;
        errors = typedResponse.errors || null;
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      // Handle Prisma specific errors
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Resource already exists';
          code = 'RESOURCE_CONFLICT';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          code = 'RECORD_NOT_FOUND';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = 'Database error';
          code = 'DATABASE_ERROR';
      }
    } else if (exception instanceof VertexAiApiError) {
      status = exception.status || HttpStatus.BAD_GATEWAY;
      message = exception.message;
      code = exception.code || 'VERTEX_AI_ERROR';
    }

    // Log the error for debugging (you might want to use a proper logger service)
    console.error('Exception:', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      exception: exception instanceof Error ? exception.stack : exception,
    });

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      code,
      errors,
    });
  }
}
