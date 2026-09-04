import { PipeTransform, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Zod validation pipe for NestJS.
 * Use in controllers: @Body(new ZodValidationPipe(schema))
 *
 * Returns parsed (and coerced) data from the schema.
 * Throws 422 Unprocessable Entity on validation failure.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      throw new UnprocessableEntityException({
        message: 'Validation failed',
        errors,
        code: 'VALIDATION_ERROR',
      });
    }

    return result.data;
  }
}
