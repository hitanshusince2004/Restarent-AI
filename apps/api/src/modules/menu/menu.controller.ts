import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { RequirePermissions, Public } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Permission } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createMenuCategorySchema,
  updateMenuCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  createVariantSchema,
  createModifierGroupSchema,
  createModifierOptionSchema,
} from '@restaurant-os/validation';

@ApiTags('Menu')
@Controller({ path: 'restaurants/:restaurantId/menu', version: '1' })
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get active public digital menu (optimized for customer scanning)' })
  async getPublicMenu(@Param('restaurantId') restaurantId: string) {
    return this.menuService.getPublicMenu(restaurantId);
  }

  // ─────────────────────────────────────────────
  // Categories
  // ─────────────────────────────────────────────

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get all categories with active items' })
  async getCategories(@Param('restaurantId') restaurantId: string) {
    return this.menuService.getCategories(restaurantId);
  }

  @Post('categories')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.MENU_CREATE)
  @ApiOperation({ summary: 'Create menu category' })
  async createCategory(
    @Param('restaurantId') restaurantId: string,
    @Body(new ZodValidationPipe(createMenuCategorySchema)) body: ReturnType<typeof createMenuCategorySchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.createCategory(restaurantId, body, user.sub);
  }

  @Patch('categories/:categoryId')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.MENU_UPDATE)
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Body(new ZodValidationPipe(updateMenuCategorySchema)) body: ReturnType<typeof updateMenuCategorySchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.updateCategory(categoryId, restaurantId, body, user.sub);
  }

  @Delete('categories/:categoryId')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.MENU_DELETE)
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.deleteCategory(categoryId, restaurantId, user.sub);
  }

  // ─────────────────────────────────────────────
  // Items
  // ─────────────────────────────────────────────

  @Get('items')
  @Public()
  @ApiOperation({ summary: 'Get all menu items' })
  async getItems(
    @Param('restaurantId') restaurantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.menuService.getItems(restaurantId, categoryId, includeInactive === 'true');
  }

  @Get('items/:itemId')
  @Public()
  @ApiOperation({ summary: 'Get single item with variants and modifiers' })
  async getItem(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.menuService.getItemById(itemId, restaurantId);
  }

  @Post('items')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.MENU_CREATE)
  @ApiOperation({ summary: 'Create menu item' })
  async createItem(
    @Param('restaurantId') restaurantId: string,
    @Body(new ZodValidationPipe(createMenuItemSchema)) body: ReturnType<typeof createMenuItemSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.createItem(restaurantId, body, user.sub);
  }

  @Patch('items/:itemId')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.MENU_UPDATE)
  @ApiOperation({ summary: 'Update menu item' })
  async updateItem(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateMenuItemSchema)) body: ReturnType<typeof updateMenuItemSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.updateItem(itemId, restaurantId, body, user.sub);
  }

  @Delete('items/:itemId')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.MENU_DELETE)
  @ApiOperation({ summary: 'Soft delete menu item' })
  async deleteItem(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.deleteItem(itemId, restaurantId, user.sub);
  }

  // ─────────────────────────────────────────────
  // Variants
  // ─────────────────────────────────────────────

  @Post('items/:itemId/variants')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.MENU_UPDATE)
  @ApiOperation({ summary: 'Add variant to item' })
  async addVariant(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(createVariantSchema)) body: ReturnType<typeof createVariantSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.addVariant(itemId, restaurantId, body, user.sub);
  }

  @Delete('variants/:variantId')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.MENU_UPDATE)
  @ApiOperation({ summary: 'Delete variant' })
  async deleteVariant(
    @Param('restaurantId') restaurantId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.menuService.deleteVariant(variantId, restaurantId);
  }

  // ─────────────────────────────────────────────
  // Modifier Groups
  // ─────────────────────────────────────────────

  @Get('modifiers')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.MENU_READ)
  @ApiOperation({ summary: 'Get all modifier groups' })
  async getModifierGroups(@Param('restaurantId') restaurantId: string) {
    return this.menuService.getModifierGroups(restaurantId);
  }

  @Post('modifiers')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.MENU_CREATE)
  @ApiOperation({ summary: 'Create modifier group' })
  async createModifierGroup(
    @Param('restaurantId') restaurantId: string,
    @Body(new ZodValidationPipe(createModifierGroupSchema)) body: ReturnType<typeof createModifierGroupSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.createModifierGroup(restaurantId, body, user.sub);
  }

  @Post('modifiers/:groupId/options')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.MENU_UPDATE)
  @ApiOperation({ summary: 'Add option to modifier group' })
  async addModifierOption(
    @Param('restaurantId') restaurantId: string,
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(createModifierOptionSchema)) body: ReturnType<typeof createModifierOptionSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menuService.addModifierOption(groupId, restaurantId, body, user.sub);
  }
}
