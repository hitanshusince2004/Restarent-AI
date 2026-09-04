import {
  Controller, Get, Post, Patch, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RestaurantsService } from './restaurants.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Permission } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createRestaurantSchema, updateRestaurantSchema } from '@restaurant-os/validation';

@ApiTags('Restaurants')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants', version: '1' })
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new restaurant (owner is the authenticated user)' })
  async create(
    @Body(new ZodValidationPipe(createRestaurantSchema)) body: ReturnType<typeof createRestaurantSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restaurantsService.create(user.sub, body);
  }

  @Get()
  @ApiOperation({ summary: 'List all restaurants the authenticated user belongs to' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.restaurantsService.findByUser(user.sub);
  }

  @Get(':restaurantId')
  @RequirePermissions(Permission.RESTAURANT_READ)
  @ApiOperation({ summary: 'Get restaurant details' })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restaurantsService.findOne(restaurantId, user.sub);
  }

  @Patch(':restaurantId')
  @RequirePermissions(Permission.RESTAURANT_UPDATE)
  @ApiOperation({ summary: 'Update restaurant details' })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Body(new ZodValidationPipe(updateRestaurantSchema)) body: ReturnType<typeof updateRestaurantSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restaurantsService.update(restaurantId, user.sub, body);
  }
}
