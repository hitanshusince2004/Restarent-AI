import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RbacService } from '../staff/rbac.service';
import { AuditService } from '../audit/audit.service';
import { CreateRestaurantDto, UpdateRestaurantDto } from '@restaurant-os/validation';
import { AuditAction, RestaurantStatus, SystemRole } from '@restaurant-os/types';

@Injectable()
export class RestaurantsService {
  private readonly logger = new Logger(RestaurantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Creates a new restaurant and sets up:
   * - System roles (OWNER, MANAGER, STAFF, KITCHEN, CASHIER)
   * - Owner membership for the creating user
   * - Default subscription (free plan)
   */
  async create(userId: string, dto: CreateRestaurantDto) {
    const slug = await this.generateUniqueSlug(dto.name);

    const restaurant = await this.prisma.$transaction(async (tx) => {
      // Create restaurant
      const newRestaurant = await tx.restaurant.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description || null,
          phone: dto.phone || null,
          email: dto.email || null,
          address: dto.address || null,
          city: dto.city || null,
          state: dto.state || null,
          pincode: dto.pincode || null,
          country: dto.country || 'IN',
          gstNumber: dto.gstNumber || null,
          fssaiNumber: dto.fssaiNumber || null,
          defaultTaxRate: dto.defaultTaxRate ?? 5,
          status: RestaurantStatus.ACTIVE,
        },
      });

      // Create system roles
      const systemRoles = Object.values(SystemRole);
      const roles = await Promise.all(
        systemRoles.map((role) =>
          tx.role.create({
            data: {
              restaurantId: newRestaurant.id,
              name: role,
              systemRole: role,
              isSystem: true,
            },
          }),
        ),
      );

      // Assign OWNER role to the creating user
      const ownerRole = roles.find((r) => r.systemRole === SystemRole.OWNER)!;
      await tx.restaurantUser.create({
        data: {
          restaurantId: newRestaurant.id,
          userId,
          roleId: ownerRole.id,
          isActive: true,
          acceptedAt: new Date(),
        },
      });

      // Create free subscription
      await tx.subscription.create({
        data: {
          restaurantId: newRestaurant.id,
          plan: 'free',
          status: 'active',
        },
      });

      return newRestaurant;
    });

    await this.auditService.log({
      actorId: userId,
      restaurantId: restaurant.id,
      action: AuditAction.OUTLET_CREATED,
      resourceType: 'restaurant',
      resourceId: restaurant.id,
      metadata: { name: restaurant.name, slug: restaurant.slug },
    });

    this.logger.log({ msg: 'Restaurant created', restaurantId: restaurant.id, userId });
    return restaurant;
  }

  /**
   * Get all restaurants a user belongs to.
   */
  async findByUser(userId: string) {
    const memberships = await this.prisma.restaurantUser.findMany({
      where: { userId, isActive: true },
      include: {
        restaurant: true,
        role: { select: { name: true, systemRole: true } },
      },
    });

    return memberships.map((m) => ({
      ...m.restaurant,
      userRole: m.role.systemRole ?? m.role.name,
    }));
  }

  /**
   * Get a single restaurant — enforces user is a member.
   */
  async findOne(restaurantId: string, userId: string) {
    await this.assertMembership(restaurantId, userId);

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        outlets: {
          where: { status: { not: 'INACTIVE' } },
          include: { _count: { select: { tables: true } } },
        },
        _count: {
          select: { menuItems: true, outlets: true },
        },
      },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async update(restaurantId: string, userId: string, dto: UpdateRestaurantDto) {
    await this.assertMembership(restaurantId, userId);

    const restaurant = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.pincode !== undefined && { pincode: dto.pincode }),
        ...(dto.gstNumber !== undefined && { gstNumber: dto.gstNumber }),
        ...(dto.fssaiNumber !== undefined && { fssaiNumber: dto.fssaiNumber }),
        ...(dto.defaultTaxRate !== undefined && { defaultTaxRate: dto.defaultTaxRate }),
      },
    });

    await this.auditService.log({
      actorId: userId,
      restaurantId,
      action: AuditAction.RESTAURANT_SETTINGS_CHANGED,
      resourceType: 'restaurant',
      resourceId: restaurantId,
      metadata: { updatedFields: Object.keys(dto) },
    });

    return restaurant;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);

    let slug = base;
    let attempt = 0;

    while (true) {
      const existing = await this.prisma.restaurant.findUnique({ where: { slug } });
      if (!existing) break;
      attempt++;
      slug = `${base}-${attempt}`;
    }

    return slug;
  }

  private async assertMembership(restaurantId: string, userId: string): Promise<void> {
    const membership = await this.prisma.restaurantUser.findUnique({
      where: { restaurantId_userId: { restaurantId, userId } },
      select: { isActive: true },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('You are not a member of this restaurant');
    }
  }
}
