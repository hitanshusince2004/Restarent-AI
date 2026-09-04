import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

/**
 * Assigns a unique request ID to every request.
 * Reads from X-Request-ID header if provided; otherwise generates one.
 * Sets the request ID in the response header for tracing.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const requestId =
      (request.headers['x-request-id'] as string) || uuidv4();

    // Attach to request for downstream use
    request.headers['x-request-id'] = requestId;

    // Echo back in response headers for client-side tracing
    response.setHeader('X-Request-ID', requestId);

    return next.handle();
  }
}
