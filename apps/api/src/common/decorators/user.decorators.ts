import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Extracts the authenticated user from the request.
 *
 * @example
 * async myRoute(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

/**
 * Extracts the restaurant ID from the request params.
 * Useful for tenant-scoped routes.
 *
 * @example
 * async myRoute(@RestaurantId() restaurantId: string) { ... }
 */
export const RestaurantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const param = request.params.restaurantId;
    return (Array.isArray(param) ? param[0] : param) || '';
  },
);
