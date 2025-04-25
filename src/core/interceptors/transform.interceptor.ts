import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
  statusCode: number;
  timestamp: string;
}

interface ResponseWithMeta<T> {
  data: T;
  meta: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data: unknown) => {
        // Handle pagination metadata if present
        let meta: Record<string, unknown> = {};

        if (data && typeof data === 'object' && 'meta' in data && 'data' in data) {
          const responseWithMeta = data as ResponseWithMeta<T>;
          meta = responseWithMeta.meta;
          data = responseWithMeta.data;
        }

        return {
          data: data as T,
          meta,
          message: 'Success',
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
