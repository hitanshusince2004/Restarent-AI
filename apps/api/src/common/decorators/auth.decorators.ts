import { SetMetadata } from '@nestjs/common';
import { Permission } from '@restaurant-os/types';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to declare required permissions for a route.
 * The JwtAuthGuard + PermissionsGuard enforce these.
 *
 * @example
 * @RequirePermissions(Permission.MENU_CREATE, Permission.MENU_UPDATE)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as publicly accessible (no JWT required).
 * @example
 * @Public()
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const CURRENT_USER_KEY = 'currentUser';
export const CURRENT_RESTAURANT_KEY = 'currentRestaurant';
