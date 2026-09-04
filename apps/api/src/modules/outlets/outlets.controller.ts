import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OutletsService } from './outlets.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Permission } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createOutletSchema, updateOutletSchema } from '@restaurant-os/validation';

@ApiTags('Outlets')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/outlets', version: '1' })
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Post()
  @RequirePermissions(Permission.OUTLET_CREATE)
  @ApiOperation({ summary: 'Create a new outlet for the restaurant' })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body(new ZodValidationPipe(createOutletSchema)) body: ReturnType<typeof createOutletSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.outletsService.create(restaurantId, body, user.sub);
  }

  @Get()
  @RequirePermissions(Permission.OUTLET_READ)
  @ApiOperation({ summary: 'List all outlets in the restaurant' })
  async findAll(@Param('restaurantId') restaurantId: string) {
    return this.outletsService.findAll(restaurantId);
  }

  @Get(':outletId')
  @RequirePermissions(Permission.OUTLET_READ)
  @ApiOperation({ summary: 'Get outlet details with floors and tables' })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('outletId') outletId: string,
  ) {
    return this.outletsService.findOne(outletId, restaurantId);
  }

  @Patch(':outletId')
  @RequirePermissions(Permission.OUTLET_UPDATE)
  @ApiOperation({ summary: 'Update outlet details' })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('outletId') outletId: string,
    @Body(new ZodValidationPipe(updateOutletSchema)) body: ReturnType<typeof updateOutletSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.outletsService.update(outletId, restaurantId, body, user.sub);
  }
}
