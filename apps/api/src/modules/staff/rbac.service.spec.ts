import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RbacService } from './rbac.service';
import { Permission, SystemRole } from '@restaurant-os/types';

describe('RbacService', () => {
  let service: RbacService;
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      restaurantUser: {
        findUnique: vi.fn(),
      },
      role: {
        upsert: vi.fn(),
        findFirst: vi.fn(),
      },
    };

    mockRedis = {
      getJson: vi.fn(),
      setJson: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
    };

    service = new RbacService(mockPrisma, mockRedis);
  });

  it('returns cached permissions when present in Redis', async () => {
    const cached = [Permission.ORDERS_READ, Permission.MENU_READ];
    mockRedis.getJson.mockResolvedValue(cached);

    const perms = await service.getUserPermissions('user-1', 'rest-1');
    expect(perms).toEqual(cached);
    expect(mockPrisma.restaurantUser.findUnique).not.toHaveBeenCalled();
  });

  it('resolves Owner role to full system permissions and caches in Redis', async () => {
    mockRedis.getJson.mockResolvedValue(null);
    mockPrisma.restaurantUser.findUnique.mockResolvedValue({
      isActive: true,
      role: {
        isSystem: true,
        systemRole: SystemRole.OWNER,
        rolePermissions: [],
      },
    });

    const perms = await service.getUserPermissions('user-1', 'rest-1');
    expect(perms).toContain(Permission.RESTAURANT_UPDATE);
    expect(perms).toContain(Permission.MENU_PUBLISH);
    expect(perms).toContain(Permission.ORDERS_CANCEL);
    expect(mockRedis.setJson).toHaveBeenCalledWith(
      'permissions:user-1:rest-1',
      expect.any(Array),
      60,
    );
  });

  it('returns empty permissions for inactive membership', async () => {
    mockRedis.getJson.mockResolvedValue(null);
    mockPrisma.restaurantUser.findUnique.mockResolvedValue({
      isActive: false,
      role: { isSystem: true, systemRole: SystemRole.OWNER },
    });

    const perms = await service.getUserPermissions('user-1', 'rest-1');
    expect(perms).toEqual([]);
  });

  it('invalidates user permission cache properly', async () => {
    await service.invalidatePermissionCache('user-1', 'rest-1');
    expect(mockRedis.del).toHaveBeenCalledWith('permissions:user-1:rest-1');
  });
});
