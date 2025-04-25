import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

interface RequestData {
  method: string;
  url: string;
  body: unknown;
  query: unknown;
  params: unknown;
}

interface ErrorResponse {
  status?: number;
  message?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestData: RequestData = {
      method: request.method,
      url: request.url,
      body: request.body,
      query: request.query,
      params: request.params,
    };
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // Log the incoming request
    this.logger.log(
      `Incoming Request - ${requestData.method} ${requestData.url}
      User Agent: ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          // Log the response
          this.logger.log(
            `Response - ${requestData.method} ${requestData.url}
            Status: ${response.statusCode}
            Response Time: ${responseTime}ms`,
          );
        },
        error: (error: ErrorResponse) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          // Log the error
          this.logger.error(
            `Error Response - ${requestData.method} ${requestData.url}
            Status: ${error.status || 500}
            Response Time: ${responseTime}ms
            Error: ${JSON.stringify(error.message)}`,
          );
        },
      }),
    );
  }
}
