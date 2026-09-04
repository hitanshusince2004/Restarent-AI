import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillsService } from './bills.service';
import { BillStatus, DiscountType, PaymentMethod, PaymentStatus } from '@restaurant-os/types';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('BillsService', () => {
  let service: BillsService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockEventsGateway: any;
  let mockPaymentProvider: any;

  beforeEach(() => {
    mockPrisma = {
      bill: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      billDiscount: {
        create: vi.fn(),
      },
      payment: {
        create: vi.fn(),
      },
      tableSession: {
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(mockPrisma);
        }
        return Promise.all(cb);
      }),
    };

    mockAudit = { log: vi.fn() };
    mockEventsGateway = {
      emitToRestaurant: vi.fn(),
      emitToSession: vi.fn(),
    };
    mockPaymentProvider = {
      processManualPayment: vi.fn().mockResolvedValue({ success: true }),
    };

    service = new BillsService(mockPrisma, mockAudit, mockEventsGateway, mockPaymentProvider);
  });

  describe('Discounts & Decimal Calculations', () => {
    it('applies percentage discount accurately without float drift', async () => {
      mockPrisma.bill.findFirst.mockResolvedValue({
        id: 'bill-1',
        restaurantId: 'rest-1',
        status: BillStatus.OPEN,
        subtotal: '1000.0000',
        taxTotal: '50.0000',
        discountTotal: '0.0000',
        grandTotal: '1050.0000',
        paidAmount: '0.0000',
        balanceAmount: '1050.0000',
      });

      await service.applyDiscount(
        'bill-1',
        'rest-1',
        {
          description: 'Happy Hour 10%',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 10,
        },
        'user-1',
      );

      expect(mockPrisma.billDiscount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          discountAmount: '100.0000',
          discountValue: '10.0000',
        }),
      });

      expect(mockPrisma.bill.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: {
          discountTotal: '100.0000',
          grandTotal: '950.0000',
          balanceAmount: '950.0000',
        },
      });
    });

    it('rejects percentage discount greater than 100%', async () => {
      mockPrisma.bill.findFirst.mockResolvedValue({
        id: 'bill-1',
        restaurantId: 'rest-1',
        status: BillStatus.OPEN,
        subtotal: '1000.0000',
        taxTotal: '50.0000',
        discountTotal: '0.0000',
        grandTotal: '1050.0000',
        paidAmount: '0.0000',
        balanceAmount: '1050.0000',
      });

      await expect(
        service.applyDiscount(
          'bill-1',
          'rest-1',
          {
            description: 'Crazy 150%',
            discountType: DiscountType.PERCENTAGE,
            discountValue: 150,
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Payments & Balance Settlement', () => {
    it('rejects payment amount exceeding balance', async () => {
      mockPrisma.bill.findFirst.mockResolvedValue({
        id: 'bill-1',
        restaurantId: 'rest-1',
        status: BillStatus.OPEN,
        balanceAmount: '500.0000',
        paidAmount: '0.0000',
        grandTotal: '500.0000',
        outletId: 'out-1',
        tableSession: { id: 'sess-1' },
      });

      await expect(
        service.createPayment(
          'bill-1',
          'rest-1',
          {
            billId: 'bill-1',
            amount: 600,
            method: PaymentMethod.CASH,
          },
          'staff-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('processes full payment, updates bill to PAID, and marks session as PAID', async () => {
      mockPrisma.bill.findFirst.mockResolvedValue({
        id: 'bill-1',
        restaurantId: 'rest-1',
        status: BillStatus.OPEN,
        balanceAmount: '500.0000',
        paidAmount: '0.0000',
        grandTotal: '500.0000',
        outletId: 'out-1',
        tableSessionId: 'sess-1',
        tableSession: { id: 'sess-1' },
      });

      await service.createPayment(
        'bill-1',
        'rest-1',
        {
          billId: 'bill-1',
          amount: 500,
          method: PaymentMethod.UPI,
          providerReference: 'UPI-TXN-123456',
        },
        'staff-1',
      );

      expect(mockPaymentProvider.processManualPayment).toHaveBeenCalled();
      expect(mockPrisma.payment.create).toHaveBeenCalled();
      expect(mockPrisma.bill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bill-1' },
          data: expect.objectContaining({
            status: BillStatus.PAID,
            paidAmount: '500.0000',
            balanceAmount: '0.0000',
          }),
        }),
      );
      expect(mockPrisma.tableSession.update).toHaveBeenCalledWith({
        where: { id: 'sess-1' },
        data: { status: 'PAID' },
      });
      expect(mockEventsGateway.emitToRestaurant).toHaveBeenCalled();
    });
  });
});
