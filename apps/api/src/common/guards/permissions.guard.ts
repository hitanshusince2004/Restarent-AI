import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../decorators/auth.decorators';
import { Permission } from '@restaurant-os/types';
import { RbacService } from '../../modules/staff/rbac.service';
import { JwtPayload } from '../../modules/auth/types/jwt-payload.type';
import { Request } from 'express';

/**
 * Permissions guard. Enforces @RequirePermissions() on routes.
 *
 * Flow:
 * 1. If route is @Public(), skip.
 * 2. Ensure user is authenticated (JWT guard runs first).
 * 3. Extract restaurantId from params/body/user context.
 * 4. Resolve user's actual permissions for that restaurant from DB/cache.
 * 5. Check all required permissions are present.
 *
 * NEVER trusts permissions from the JWT payload itself.
 * Always re-resolves from the database (with Redis caching).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permissions declared = authenticated access only
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Determine restaurantId from params, body, or user default
    const paramRestaurantId = request.params.restaurantId;
    const resolvedFromParam = Array.isArray(paramRestaurantId) ? paramRestaurantId[0] : paramRestaurantId;
    const restaurantId =
      resolvedFromParam ||
      (request.body as Record<string, string>)?.restaurantId ||
      null;

    if (!restaurantId) {
      // If no restaurant context, check if user has the permission in any restaurant
      // For most routes this should not happen — log it
      this.logger.warn(`No restaurantId found for permission check on ${request.url}`);
      throw new ForbiddenException('Restaurant context required');
    }

    const userPermissions = await this.rbacService.getUserPermissions(user.sub, restaurantId);

    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAllPermissions) {
      const missing = requiredPermissions.filter((p) => !userPermissions.includes(p));
      this.logger.warn({
        msg: 'Permission denied',
        userId: user.sub,
        restaurantId,
        missing,
        url: request.url,
      });
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
