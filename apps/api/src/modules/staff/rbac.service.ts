import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Permission, SystemRole } from '@restaurant-os/types';

/** Cache TTL: 60 seconds — short enough for permission changes to propagate quickly */
const PERMISSION_CACHE_TTL = 60;

/** Default permission sets per system role */
const ROLE_DEFAULT_PERMISSIONS: Record<SystemRole, Permission[]> = {
  [SystemRole.OWNER]: Object.values(Permission),
  [SystemRole.MANAGER]: [
    Permission.RESTAURANT_READ,
    Permission.OUTLET_READ,
    Permission.OUTLET_UPDATE,
    Permission.TABLE_READ,
    Permission.TABLE_CREATE,
    Permission.TABLE_UPDATE,
    Permission.QR_READ,
    Permission.QR_GENERATE,
    Permission.MENU_READ,
    Permission.MENU_CREATE,
    Permission.MENU_UPDATE,
    Permission.MENU_DELETE,
    Permission.MENU_PUBLISH,
    Permission.MENU_IMPORT_CREATE,
    Permission.MENU_IMPORT_REVIEW,
    Permission.ORDERS_READ,
    Permission.ORDERS_UPDATE,
    Permission.ORDERS_CANCEL,
    Permission.KITCHEN_READ,
    Permission.KITCHEN_UPDATE,
    Permission.BILLING_READ,
    Permission.BILLING_UPDATE,
    Permission.PAYMENT_CREATE,
    Permission.STAFF_READ,
    Permission.REPORTS_READ,
    Permission.SETTINGS_MANAGE,
    Permission.CUSTOMERS_READ,
    Permission.AUDIT_READ,
  ],
  [SystemRole.STAFF]: [
    Permission.RESTAURANT_READ,
    Permission.OUTLET_READ,
    Permission.TABLE_READ,
    Permission.QR_READ,
    Permission.MENU_READ,
    Permission.ORDERS_READ,
    Permission.ORDERS_CREATE,
    Permission.ORDERS_UPDATE,
    Permission.KITCHEN_READ,
    Permission.BILLING_READ,
    Permission.PAYMENT_CREATE,
    Permission.CUSTOMERS_READ,
  ],
  [SystemRole.KITCHEN]: [
    Permission.RESTAURANT_READ,
    Permission.MENU_READ,
    Permission.ORDERS_READ,
    Permission.KITCHEN_READ,
    Permission.KITCHEN_UPDATE,
  ],
  [SystemRole.CASHIER]: [
    Permission.RESTAURANT_READ,
    Permission.OUTLET_READ,
    Permission.TABLE_READ,
    Permission.MENU_READ,
    Permission.ORDERS_READ,
    Permission.BILLING_READ,
    Permission.BILLING_UPDATE,
    Permission.PAYMENT_CREATE,
    Permission.CUSTOMERS_READ,
  ],
};

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Returns the set of permissions a user has within a specific restaurant.
   * Results are cached in Redis for PERMISSION_CACHE_TTL seconds.
   *
   * NEVER called from the frontend — this is server-side only.
   * NEVER trusts role/permissions from JWT payload.
   */
  async getUserPermissions(userId: string, restaurantId: string): Promise<Permission[]> {
    const cacheKey = `permissions:${userId}:${restaurantId}`;

    const cached = await this.redis.getJson<Permission[]>(cacheKey);
    if (cached) return cached;

    const membership = await this.prisma.restaurantUser.findUnique({
      where: { restaurantId_userId: { restaurantId, userId } },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!membership || !membership.isActive) {
      return [];
    }

    let permissions: Permission[];

    if (membership.role.isSystem && membership.role.systemRole) {
      // System roles use predefined permission sets
      permissions = ROLE_DEFAULT_PERMISSIONS[membership.role.systemRole] ?? [];
    } else {
      // Custom roles use explicitly assigned permissions
      permissions = membership.role.rolePermissions.map(
        (rp) => rp.permission.name as Permission,
      );
    }

    await this.redis.setJson(cacheKey, permissions, PERMISSION_CACHE_TTL);

    return permissions;
  }

  /**
   * Invalidates the cached permissions for a user in a restaurant.
   * Call this after any role/permission change.
   */
  async invalidatePermissionCache(userId: string, restaurantId: string): Promise<void> {
    await this.redis.del(`permissions:${userId}:${restaurantId}`);
  }

  /**
   * Invalidates ALL cached permissions for everyone in a restaurant.
   * Call this after a role definition changes.
   */
  async invalidateRestaurantPermissionCache(restaurantId: string): Promise<void> {
    const keys = await this.redis.keys(`permissions:*:${restaurantId}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Checks if a user has a specific permission in a restaurant.
   */
  async hasPermission(
    userId: string,
    restaurantId: string,
    permission: Permission,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, restaurantId);
    return permissions.includes(permission);
  }

  /**
   * Returns the user's role name in a restaurant, or null if not a member.
   */
  async getUserRole(userId: string, restaurantId: string): Promise<string | null> {
    const membership = await this.prisma.restaurantUser.findUnique({
      where: { restaurantId_userId: { restaurantId, userId } },
      include: { role: { select: { name: true, systemRole: true } } },
    });

    if (!membership || !membership.isActive) return null;
    return membership.role.systemRole ?? membership.role.name;
  }

  /**
   * Ensures system roles exist for a restaurant (called after restaurant creation).
   */
  async seedRestaurantRoles(restaurantId: string): Promise<void> {
    const systemRoles = Object.values(SystemRole);

    for (const roleName of systemRoles) {
      await this.prisma.role.upsert({
        where: { restaurantId_name: { restaurantId, name: roleName } },
        create: {
          restaurantId,
          name: roleName,
          systemRole: roleName,
          isSystem: true,
          description: `System ${roleName} role`,
        },
        update: {},
      });
    }

    this.logger.log({ msg: 'System roles seeded', restaurantId });
  }

  /**
   * Gets the OWNER role for a restaurant.
   */
  async getOwnerRole(restaurantId: string) {
    return this.prisma.role.findFirst({
      where: { restaurantId, systemRole: SystemRole.OWNER },
    });
  }
}
