import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiErrorResponse } from '@restaurant-os/types';
import { ZodError } from 'zod';

/**
 * Global exception filter.
 * Translates all exceptions into the standard API error format.
 * NEVER exposes internal stack traces in production.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) || 'unknown';
    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred. Please try again.';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let details: Record<string, any> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || message;
        code = (resp.error as string) || this.statusToCode(status);
        if (Array.isArray(resp.message)) {
          // NestJS validation pipe returns array of messages
          message = 'Validation failed';
          details = { validationErrors: resp.message };
        }
      }
      code = this.statusToCode(status);
    } else if (exception instanceof ZodError) {
      // Zod validation error
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      code = 'VALIDATION_ERROR';
      message = 'Request validation failed';
      details = {
        validationErrors: exception.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      };
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const result = this.handlePrismaError(exception);
      status = result.status;
      code = result.code;
      message = result.message;
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'INVALID_DATA';
      message = 'Invalid data provided';
    } else {
      // Unknown error — log but don't expose to client
      this.logger.error({
        msg: 'Unhandled exception',
        requestId,
        error:
          exception instanceof Error
            ? { message: exception.message, stack: isProd ? undefined : exception.stack }
            : String(exception),
      });
    }

    if (status >= 500) {
      this.logger.error({
        msg: 'Server error',
        requestId,
        status,
        code,
        url: request.url,
        method: request.method,
        error: isProd ? undefined : exception instanceof Error ? exception.message : String(exception),
      });
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        requestId,
        details: isProd ? undefined : details,
      },
    };

    response.status(status).json(errorResponse);
  }

  private statusToCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      409: 'CONFLICT',
      410: 'GONE',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[status] || 'ERROR';
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    code: string;
    message: string;
  } {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const fields = (error.meta?.target as string[])?.join(', ') || 'field';
        return {
          status: HttpStatus.CONFLICT,
          code: 'DUPLICATE_ENTRY',
          message: `A record with this ${fields} already exists.`,
        };
      }
      case 'P2003':
        // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'INVALID_REFERENCE',
          message: 'Referenced record does not exist.',
        };
      case 'P2025':
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'Record not found.',
        };
      case 'P2034':
        // Transaction conflict / write conflict
        return {
          status: HttpStatus.CONFLICT,
          code: 'WRITE_CONFLICT',
          message: 'The operation conflicted with another request. Please retry.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_ERROR',
          message: 'A database error occurred.',
        };
    }
  }
}
