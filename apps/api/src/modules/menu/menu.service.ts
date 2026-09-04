import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../../gateway/events.gateway';
import {
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
  CreateVariantDto,
  CreateModifierGroupDto,
  CreateModifierOptionDto,
} from '@restaurant-os/validation';
import { AuditAction, MenuItemStatus, SocketEvent } from '@restaurant-os/types';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ─────────────────────────────────────────────
  // Categories
  // ─────────────────────────────────────────────

  async getCategories(restaurantId: string) {
    return this.prisma.menuCategory.findMany({
      where: { restaurantId, isActive: true },
      include: {
        menuItems: {
          where: { status: MenuItemStatus.ACTIVE, deletedAt: null },
          include: { variants: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async createCategory(restaurantId: string, dto: CreateMenuCategoryDto, actorId: string) {
    const category = await this.prisma.menuCategory.create({
      data: { restaurantId, ...dto },
    });

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.MENU_ITEM_CREATED,
      resourceType: 'menu_category',
      resourceId: category.id,
      metadata: { name: category.name },
    });

    return category;
  }

  async updateCategory(
    categoryId: string,
    restaurantId: string,
    dto: UpdateMenuCategoryDto,
    actorId: string,
  ) {
    await this.assertCategoryOwnership(categoryId, restaurantId);

    return this.prisma.menuCategory.update({
      where: { id: categoryId },
      data: dto,
    });
  }

  async deleteCategory(categoryId: string, restaurantId: string, actorId: string) {
    await this.assertCategoryOwnership(categoryId, restaurantId);

    const itemCount = await this.prisma.menuItem.count({
      where: { categoryId, deletedAt: null },
    });

    if (itemCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${itemCount} menu item(s). Move or delete items first.`,
      );
    }

    await this.prisma.menuCategory.delete({ where: { id: categoryId } });
  }

  // ─────────────────────────────────────────────
  // Menu Items
  // ─────────────────────────────────────────────

  async getItems(restaurantId: string, categoryId?: string, includeInactive = false) {
    return this.prisma.menuItem.findMany({
      where: {
        restaurantId,
        deletedAt: null,
        ...(categoryId ? { categoryId } : {}),
        ...(includeInactive ? {} : { status: MenuItemStatus.ACTIVE }),
      },
      include: {
        category: { select: { id: true, name: true } },
        variants: { orderBy: { displayOrder: 'asc' } },
        modifierGroups: {
          include: {
            modifierGroup: {
              include: { options: { orderBy: { displayOrder: 'asc' } } },
            },
          },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getItemById(itemId: string, restaurantId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId, deletedAt: null },
      include: {
        category: true,
        variants: { orderBy: { displayOrder: 'asc' } },
        modifierGroups: {
          include: { modifierGroup: { include: { options: { orderBy: { displayOrder: 'asc' } } } } },
        },
        availability: true,
      },
    });

    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  async createItem(restaurantId: string, dto: CreateMenuItemDto, actorId: string) {
    const { categoryId, modifierGroupIds, ...itemData } = dto;

    // Verify category belongs to restaurant
    await this.assertCategoryOwnership(categoryId, restaurantId);

    // Verify all modifier groups belong to restaurant
    if (modifierGroupIds.length > 0) {
      const validGroups = await this.prisma.modifierGroup.count({
        where: { id: { in: modifierGroupIds }, restaurantId },
      });
      if (validGroups !== modifierGroupIds.length) {
        throw new BadRequestException('One or more modifier groups not found for this restaurant');
      }
    }

    const item = await this.prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId,
        name: itemData.name,
        description: itemData.description ?? null,
        basePrice: itemData.basePrice,
        foodType: itemData.foodType,
        spiceLevel: itemData.spiceLevel ?? null,
        preparationTimeMinutes: itemData.preparationTimeMinutes ?? null,
        calories: itemData.calories ?? null,
        isRecommended: itemData.isRecommended ?? false,
        taxRate: itemData.taxRate ?? 5,
        hsnCode: itemData.hsnCode ?? null,
        displayOrder: itemData.displayOrder ?? 0,
        status: MenuItemStatus.ACTIVE,
        modifierGroups: modifierGroupIds.length > 0
          ? {
              create: modifierGroupIds.map((mgId, idx) => ({
                modifierGroupId: mgId,
                displayOrder: idx,
              })),
            }
          : undefined,
      },
      include: { variants: true, modifierGroups: { include: { modifierGroup: true } } },
    });

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.MENU_ITEM_CREATED,
      resourceType: 'menu_item',
      resourceId: item.id,
      metadata: { name: item.name, basePrice: item.basePrice.toString() },
    });

    return item;
  }

  async updateItem(
    itemId: string,
    restaurantId: string,
    dto: UpdateMenuItemDto,
    actorId: string,
  ) {
    const existingItem = await this.prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId, deletedAt: null },
      select: { id: true, basePrice: true, name: true },
    });

    if (!existingItem) throw new NotFoundException('Menu item not found');

    const priceChanged =
      dto.basePrice !== undefined &&
      String(dto.basePrice) !== existingItem.basePrice.toString();

    const { modifierGroupIds, categoryId, ...updateData } = dto;

    const updatedItem = await this.prisma.$transaction(async (tx) => {
      const item = await tx.menuItem.update({
        where: { id: itemId },
        data: {
          ...updateData,
          ...(categoryId ? { categoryId } : {}),
          ...(modifierGroupIds !== undefined
            ? {
                modifierGroups: {
                  deleteMany: {},
                  create: modifierGroupIds.map((mgId, idx) => ({
                    modifierGroupId: mgId,
                    displayOrder: idx,
                  })),
                },
              }
            : {}),
        },
        include: { variants: true, modifierGroups: { include: { modifierGroup: true } } },
      });
      return item;
    });

    await this.auditService.log({
      actorId,
      restaurantId,
      action: priceChanged ? AuditAction.MENU_ITEM_PRICE_CHANGED : AuditAction.MENU_ITEM_UPDATED,
      resourceType: 'menu_item',
      resourceId: itemId,
      metadata: {
        updatedFields: Object.keys(dto),
        ...(priceChanged
          ? { oldPrice: existingItem.basePrice.toString(), newPrice: dto.basePrice }
          : {}),
      },
    });

    // Emit menu update to customers and staff
    await this.eventsGateway.emitToRestaurant(restaurantId, SocketEvent.MENU_UPDATED, {
      restaurantId,
      itemId,
      action: 'updated',
    });

    return updatedItem;
  }

  async deleteItem(itemId: string, restaurantId: string, actorId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId, deletedAt: null },
    });

    if (!item) throw new NotFoundException('Menu item not found');

    // Soft delete — preserves historical order data
    await this.prisma.menuItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date(), status: MenuItemStatus.INACTIVE },
    });

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.MENU_ITEM_DELETED,
      resourceType: 'menu_item',
      resourceId: itemId,
      metadata: { name: item.name },
    });
  }

  // ─────────────────────────────────────────────
  // Variants
  // ─────────────────────────────────────────────

  async addVariant(itemId: string, restaurantId: string, dto: CreateVariantDto, actorId: string) {
    await this.assertItemOwnership(itemId, restaurantId);

    // If this is default, clear other defaults
    if (dto.isDefault) {
      await this.prisma.menuItemVariant.updateMany({
        where: { menuItemId: itemId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.menuItemVariant.create({
      data: { menuItemId: itemId, ...dto },
    });
  }

  async updateVariant(variantId: string, restaurantId: string, dto: Partial<CreateVariantDto>) {
    const variant = await this.prisma.menuItemVariant.findFirst({
      where: { id: variantId, menuItem: { restaurantId } },
    });

    if (!variant) throw new NotFoundException('Variant not found');

    return this.prisma.menuItemVariant.update({ where: { id: variantId }, data: dto });
  }

  async deleteVariant(variantId: string, restaurantId: string) {
    const variant = await this.prisma.menuItemVariant.findFirst({
      where: { id: variantId, menuItem: { restaurantId } },
    });

    if (!variant) throw new NotFoundException('Variant not found');

    await this.prisma.menuItemVariant.delete({ where: { id: variantId } });
  }

  // ─────────────────────────────────────────────
  // Modifier Groups
  // ─────────────────────────────────────────────

  async getModifierGroups(restaurantId: string) {
    return this.prisma.modifierGroup.findMany({
      where: { restaurantId },
      include: { options: { orderBy: { displayOrder: 'asc' } } },
    });
  }

  async createModifierGroup(restaurantId: string, dto: CreateModifierGroupDto, actorId: string) {
    return this.prisma.modifierGroup.create({
      data: { restaurantId, ...dto },
      include: { options: true },
    });
  }

  async addModifierOption(
    groupId: string,
    restaurantId: string,
    dto: CreateModifierOptionDto,
    actorId: string,
  ) {
    const group = await this.prisma.modifierGroup.findFirst({
      where: { id: groupId, restaurantId },
    });

    if (!group) throw new NotFoundException('Modifier group not found');

    return this.prisma.modifierOption.create({
      data: { modifierGroupId: groupId, ...dto },
    });
  }

  // ─────────────────────────────────────────────
  // Customer-facing menu (optimized, public)
  // ─────────────────────────────────────────────

  async getPublicMenu(restaurantId: string) {
    const categories = await this.prisma.menuCategory.findMany({
      where: { restaurantId, isActive: true },
      include: {
        menuItems: {
          where: { status: MenuItemStatus.ACTIVE, deletedAt: null },
          include: {
            variants: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } },
            modifierGroups: {
              include: {
                modifierGroup: {
                  include: {
                    options: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } },
                  },
                },
              },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Filter out empty categories
    return categories.filter((c) => c.menuItems.length > 0);
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  private async assertCategoryOwnership(categoryId: string, restaurantId: string) {
    const category = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, restaurantId },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Category not found for this restaurant');
  }

  private async assertItemOwnership(itemId: string, restaurantId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId, deletedAt: null },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Menu item not found for this restaurant');
  }
}
