import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Permission } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createTableSchema, updateTableSchema, updateTablePositionSchema } from '@restaurant-os/validation';

@ApiTags('Tables')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/outlets/:outletId/tables', version: '1' })
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @RequirePermissions(Permission.TABLE_CREATE)
  @ApiOperation({ summary: 'Create table for outlet' })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Param('outletId') outletId: string,
    @Body(new ZodValidationPipe(createTableSchema)) body: ReturnType<typeof createTableSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tablesService.create(outletId, restaurantId, body, user.sub);
  }

  @Get()
  @RequirePermissions(Permission.TABLE_READ)
  @ApiOperation({ summary: 'List all tables for outlet' })
  async findAll(
    @Param('restaurantId') restaurantId: string,
    @Param('outletId') outletId: string,
  ) {
    return this.tablesService.findAll(outletId, restaurantId);
  }

  @Get(':tableId')
  @RequirePermissions(Permission.TABLE_READ)
  @ApiOperation({ summary: 'Get table details and active sessions' })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.tablesService.findOne(tableId, restaurantId);
  }

  @Patch(':tableId')
  @RequirePermissions(Permission.TABLE_UPDATE)
  @ApiOperation({ summary: 'Update table' })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
    @Body(new ZodValidationPipe(updateTableSchema)) body: ReturnType<typeof updateTableSchema.parse>,
  ) {
    return this.tablesService.update(tableId, restaurantId, body);
  }

  @Patch(':tableId/position')
  @RequirePermissions(Permission.TABLE_UPDATE)
  @ApiOperation({ summary: 'Update table 2D visual position' })
  async updatePosition(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
    @Body(new ZodValidationPipe(updateTablePositionSchema)) body: ReturnType<typeof updateTablePositionSchema.parse>,
  ) {
    return this.tablesService.updatePosition(tableId, restaurantId, body.positionX, body.positionY);
  }

  @Delete(':tableId')
  @RequirePermissions(Permission.TABLE_DELETE)
  @ApiOperation({ summary: 'Delete table' })
  async delete(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.tablesService.delete(tableId, restaurantId);
  }
}
