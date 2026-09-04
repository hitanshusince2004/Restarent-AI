import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '@restaurant-os/types';

/**
 * Wraps all successful controller responses in the standard
 * { success: true, data: ... } envelope.
 * Only wraps non-null, non-undefined responses.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the service already returns a wrapped response, pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        return {
          success: true as const,
          data,
        };
      }),
    );
  }
}
