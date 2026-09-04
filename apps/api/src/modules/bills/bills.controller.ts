import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { RequirePermissions, Public } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Permission } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { applyDiscountSchema, createPaymentSchema } from '@restaurant-os/validation';

@ApiTags('Bills')
@Controller({ path: 'restaurants/:restaurantId/bills', version: '1' })
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get('session/:sessionId')
  @Public()
  @ApiOperation({ summary: 'Get current running bill for a table session' })
  async findBySession(
    @Param('restaurantId') restaurantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.billsService.findBySession(sessionId, restaurantId);
  }

  @Get(':billId')
  @Public()
  @ApiOperation({ summary: 'Get bill details by ID' })
  async findById(
    @Param('restaurantId') restaurantId: string,
    @Param('billId') billId: string,
  ) {
    return this.billsService.findById(billId, restaurantId);
  }

  @Post(':billId/discount')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.BILLING_UPDATE)
  @ApiOperation({ summary: 'Apply discount to a bill' })
  async applyDiscount(
    @Param('restaurantId') restaurantId: string,
    @Param('billId') billId: string,
    @Body(new ZodValidationPipe(applyDiscountSchema)) body: ReturnType<typeof applyDiscountSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.billsService.applyDiscount(billId, restaurantId, body, user.sub);
  }

  @Post(':billId/payment')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.PAYMENT_CREATE)
  @ApiOperation({ summary: 'Record a payment against a bill (Cash, UPI, Card)' })
  async createPayment(
    @Param('restaurantId') restaurantId: string,
    @Param('billId') billId: string,
    @Body(new ZodValidationPipe(createPaymentSchema)) body: ReturnType<typeof createPaymentSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.billsService.createPayment(billId, restaurantId, body, user.sub);
  }
}
