import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { RequirePermissions, Public } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Permission, OrderStatus } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  submitOrderSchema,
  updateOrderStatusSchema,
  paginationSchema,
} from '@restaurant-os/validation';

@ApiTags('Orders')
@Controller({ path: 'restaurants/:restaurantId/orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit order from cart (Customer or Staff)' })
  async submitOrder(
    @Param('restaurantId') restaurantId: string,
    @Body(new ZodValidationPipe(submitOrderSchema)) body: ReturnType<typeof submitOrderSchema.parse>,
  ) {
    return this.ordersService.submitOrder(body, restaurantId);
  }

  @Get()
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.ORDERS_READ)
  @ApiOperation({ summary: 'List restaurant orders with pagination & status filters' })
  async findByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @Query(new ZodValidationPipe(paginationSchema)) pagination: { page: number; limit: number },
    @Query('status') status?: OrderStatus,
    @Query('outletId') outletId?: string,
  ) {
    return this.ordersService.findByRestaurant(restaurantId, {
      ...pagination,
      status,
      outletId,
    });
  }

  @Get('session/:sessionId')
  @Public()
  @ApiOperation({ summary: 'Get all orders submitted in a table session' })
  async findBySession(
    @Param('restaurantId') restaurantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.ordersService.findBySession(sessionId, restaurantId);
  }

  @Get(':orderId')
  @Public()
  @ApiOperation({ summary: 'Get order details by ID' })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.findOne(orderId, restaurantId);
  }

  @Patch(':orderId/status')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.ORDERS_UPDATE)
  @ApiOperation({ summary: 'Transition order status (state machine protected)' })
  async updateStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(updateOrderStatusSchema)) body: ReturnType<typeof updateOrderStatusSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.updateStatus(
      orderId,
      restaurantId,
      body.status as OrderStatus,
      user.sub,
      body.reason ?? undefined,
    );
  }
}
