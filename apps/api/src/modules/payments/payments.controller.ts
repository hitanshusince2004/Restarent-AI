import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { Permission, PaymentStatus } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { paginationSchema } from '@restaurant-os/validation';

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequirePermissions(Permission.BILLING_READ)
  @ApiOperation({ summary: 'List payments for restaurant with pagination' })
  async findPayments(
    @Param('restaurantId') restaurantId: string,
    @Query(new ZodValidationPipe(paginationSchema)) pagination: { page: number; limit: number },
    @Query('status') status?: PaymentStatus,
    @Query('method') method?: string,
  ) {
    return this.paymentsService.findPayments(restaurantId, {
      ...pagination,
      status,
      method,
    });
  }

  @Get(':paymentId')
  @RequirePermissions(Permission.BILLING_READ)
  @ApiOperation({ summary: 'Get payment record details' })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentsService.findOne(paymentId, restaurantId);
  }
}
