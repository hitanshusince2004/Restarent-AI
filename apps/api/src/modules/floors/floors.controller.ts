import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FloorsService } from './floors.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { Permission } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createFloorSchema, updateFloorSchema } from '@restaurant-os/validation';

@ApiTags('Floors')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/outlets/:outletId/floors', version: '1' })
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post()
  @RequirePermissions(Permission.OUTLET_UPDATE)
  @ApiOperation({ summary: 'Create floor for outlet' })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Param('outletId') outletId: string,
    @Body(new ZodValidationPipe(createFloorSchema)) body: ReturnType<typeof createFloorSchema.parse>,
  ) {
    return this.floorsService.create(outletId, restaurantId, body);
  }

  @Get()
  @RequirePermissions(Permission.OUTLET_READ)
  @ApiOperation({ summary: 'Get all floors with tables for outlet' })
  async findAll(
    @Param('restaurantId') restaurantId: string,
    @Param('outletId') outletId: string,
  ) {
    return this.floorsService.findAll(outletId, restaurantId);
  }

  @Patch(':floorId')
  @RequirePermissions(Permission.OUTLET_UPDATE)
  @ApiOperation({ summary: 'Update floor' })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('floorId') floorId: string,
    @Body(new ZodValidationPipe(updateFloorSchema)) body: ReturnType<typeof updateFloorSchema.parse>,
  ) {
    return this.floorsService.update(floorId, restaurantId, body);
  }

  @Delete(':floorId')
  @RequirePermissions(Permission.OUTLET_UPDATE)
  @ApiOperation({ summary: 'Delete floor' })
  async delete(
    @Param('restaurantId') restaurantId: string,
    @Param('floorId') floorId: string,
  ) {
    return this.floorsService.delete(floorId, restaurantId);
  }
}
