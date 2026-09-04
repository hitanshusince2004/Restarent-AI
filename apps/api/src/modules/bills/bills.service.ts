import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../../gateway/events.gateway';
import { PaymentProviderService } from '../../providers/payment/payment-provider.service';
import { CreatePaymentDto, ApplyDiscountDto } from '@restaurant-os/validation';
import {
  BillStatus,
  PaymentStatus,
  AuditAction,
  SocketEvent,
  DiscountType,
} from '@restaurant-os/types';
import { PaymentProviderEnum } from '@prisma/client';
import Decimal_ from 'decimal.js';

@Injectable()
export class BillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventsGateway: EventsGateway,
    private readonly paymentProvider: PaymentProviderService,
  ) {}

  async findBySession(tableSessionId: string, restaurantId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { tableSessionId },
      include: {
        billItems: {
          include: {
            order: { include: { orderItems: { include: { orderItemModifiers: true } } } },
          },
        },
        discounts: true,
        payments: { where: { status: PaymentStatus.COMPLETED } },
      },
    });

    if (!bill) throw new NotFoundException('Bill not found for this session');
    if (bill.restaurantId !== restaurantId) throw new NotFoundException('Bill not found');

    return bill;
  }

  async findById(billId: string, restaurantId: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, restaurantId },
      include: {
        billItems: { include: { order: { include: { orderItems: true } } } },
        discounts: true,
        payments: true,
      },
    });

    if (!bill) throw new NotFoundException('Bill not found');
    return bill;
  }

  /**
   * Apply a discount to a bill.
   * Recalculates grandTotal and balanceAmount server-side.
   * Never trusts client-provided totals.
   */
  async applyDiscount(
    billId: string,
    restaurantId: string,
    dto: ApplyDiscountDto,
    actorId: string,
  ) {
    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, restaurantId },
    });

    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status === BillStatus.PAID || bill.status === BillStatus.VOID) {
      throw new BadRequestException(`Cannot apply discount to a ${bill.status} bill`);
    }

    const subtotal = new Decimal_(bill.subtotal.toString());
    const tax = new Decimal_(bill.taxTotal.toString());

    let discountAmount: Decimal_;

    if (dto.discountType === DiscountType.PERCENTAGE) {
      if (dto.discountValue > 100) {
        throw new BadRequestException('Percentage discount cannot exceed 100%');
      }
      discountAmount = subtotal.mul(dto.discountValue).div(100);
    } else {
      discountAmount = new Decimal_(dto.discountValue);
      if (discountAmount.greaterThan(subtotal)) {
        throw new BadRequestException('Fixed discount cannot exceed bill subtotal');
      }
    }

    const existingDiscounts = new Decimal_(bill.discountTotal.toString());
    const newDiscountTotal = existingDiscounts.plus(discountAmount);
    const newGrandTotal = subtotal.plus(tax).minus(newDiscountTotal);
    const paidAmount = new Decimal_(bill.paidAmount.toString());
    const newBalance = newGrandTotal.minus(paidAmount);

    await this.prisma.$transaction([
      this.prisma.billDiscount.create({
        data: {
          billId,
          description: dto.description,
          discountType: dto.discountType,
          discountValue: dto.discountValue.toFixed(4),
          discountAmount: discountAmount.toFixed(4),
          appliedBy: actorId,
        },
      }),
      this.prisma.bill.update({
        where: { id: billId },
        data: {
          discountTotal: newDiscountTotal.toFixed(4),
          grandTotal: newGrandTotal.toFixed(4),
          balanceAmount: newBalance.toFixed(4),
        },
      }),
    ]);

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.DISCOUNT_APPLIED,
      resourceType: 'bill',
      resourceId: billId,
      metadata: {
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        discountAmount: discountAmount.toFixed(2),
      },
    });

    return this.findById(billId, restaurantId);
  }

  /**
   * Create a payment for a bill.
   * Calculates remaining balance server-side.
   */
  async createPayment(
    billId: string,
    restaurantId: string,
    dto: CreatePaymentDto,
    actorId: string,
  ) {
    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, restaurantId },
      include: { tableSession: { select: { id: true } } },
    });

    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status === BillStatus.PAID) {
      throw new ConflictException('Bill is already fully paid');
    }
    if (bill.status === BillStatus.VOID) {
      throw new BadRequestException('Cannot add payment to a voided bill');
    }

    const balance = new Decimal_(bill.balanceAmount.toString());
    const paymentAmount = new Decimal_(dto.amount);

    if (paymentAmount.greaterThan(balance)) {
      throw new BadRequestException(
        `Payment amount (₹${paymentAmount.toFixed(2)}) exceeds remaining balance (₹${balance.toFixed(2)})`,
      );
    }

    // Process via payment provider
    const idempotencyKey = `pay-${billId}-${Date.now()}`;
    const providerResult = await this.paymentProvider.processManualPayment({
      billId,
      amount: paymentAmount.toNumber(),
      method: dto.method,
      providerReference: dto.providerReference || undefined,
    });

    const newPaidAmount = new Decimal_(bill.paidAmount.toString()).plus(paymentAmount);
    const newBalance = new Decimal_(bill.grandTotal.toString()).minus(newPaidAmount);
    const isFullyPaid = newBalance.lessThanOrEqualTo(0);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          billId,
          restaurantId,
          outletId: bill.outletId,
          amount: paymentAmount.toFixed(4),
          method: dto.method,
          status: providerResult.success ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
          provider: PaymentProviderEnum.MANUAL,
          providerReference: dto.providerReference || null,
          notes: dto.notes || null,
          markedById: actorId,
          markedAt: now,
          idempotencyKey,
          failureReason: providerResult.success ? null : (providerResult.failureReason || null),
        },
      });

      await tx.bill.update({
        where: { id: billId },
        data: {
          paidAmount: newPaidAmount.toFixed(4),
          balanceAmount: newBalance.toFixed(4),
          status: isFullyPaid
            ? BillStatus.PAID
            : newPaidAmount.greaterThan(0)
            ? BillStatus.PARTIAL
            : BillStatus.OPEN,
          paidAt: isFullyPaid ? now : null,
        },
      });

      if (isFullyPaid) {
        await tx.tableSession.update({
          where: { id: bill.tableSessionId },
          data: { status: 'PAID' },
        });
      }
    });

    // Emit payment event
    await this.eventsGateway.emitToRestaurant(restaurantId, SocketEvent.PAYMENT_RECEIVED, {
      billId,
      amount: paymentAmount.toFixed(2),
      method: dto.method,
      isFullyPaid,
      restaurantId,
    });

    await this.eventsGateway.emitToSession(bill.tableSessionId, SocketEvent.PAYMENT_UPDATED, {
      billId,
      status: isFullyPaid ? BillStatus.PAID : BillStatus.PARTIAL,
      paidAmount: newPaidAmount.toFixed(2),
      balanceAmount: newBalance.toFixed(2),
    });

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.PAYMENT_MARKED_COMPLETE,
      resourceType: 'payment',
      resourceId: billId,
      metadata: { amount: paymentAmount.toFixed(2), method: dto.method, isFullyPaid },
    });

    return this.findById(billId, restaurantId);
  }
}
