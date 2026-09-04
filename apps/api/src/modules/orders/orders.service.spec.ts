import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrdersService } from './orders.service';
import { OrderStatus, ORDER_STATUS_TRANSITIONS, TableSessionStatus } from '@restaurant-os/types';
import { UnprocessableEntityException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockEventsGateway: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      tableSession: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      menuItem: {
        findFirst: vi.fn(),
      },
      kitchenTicket: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      bill: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      billItem: {
        upsert: vi.fn(),
      },
      orderItem: {
        create: vi.fn(),
      },
      orderItemModifier: {
        createMany: vi.fn(),
      },
      orderEvent: {
        create: vi.fn(),
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
      emitToKitchen: vi.fn(),
    };

    service = new OrdersService(mockPrisma, mockAudit, mockEventsGateway);
  });

  describe('State Machine & Transitions', () => {
    it('validates allowed transitions correctly', () => {
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PENDING]).toContain(OrderStatus.ACCEPTED);
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PENDING]).toContain(OrderStatus.CANCELLED);
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.ACCEPTED]).toContain(OrderStatus.PREPARING);
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PREPARING]).toContain(OrderStatus.READY);
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.READY]).toContain(OrderStatus.SERVED);
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.SERVED]).toContain(OrderStatus.COMPLETED);
    });

    it('rejects invalid state transition (e.g. PENDING -> COMPLETED directly)', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'ord-123',
        status: OrderStatus.PENDING,
        tableSessionId: 'sess-1',
        outletId: 'out-1',
        orderNumber: 'ORD-001',
      });

      await expect(
        service.updateStatus('ord-123', 'rest-1', OrderStatus.COMPLETED, 'staff-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('successfully transitions from PENDING to ACCEPTED and emits event', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'ord-123',
        status: OrderStatus.PENDING,
        tableSessionId: 'sess-1',
        outletId: 'out-1',
        orderNumber: 'ORD-001',
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'ord-123',
        status: OrderStatus.ACCEPTED,
        orderNumber: 'ORD-001',
      });

      const res = await service.updateStatus('ord-123', 'rest-1', OrderStatus.ACCEPTED, 'staff-1');
      expect(res.status).toBe(OrderStatus.ACCEPTED);
      expect(mockEventsGateway.emitToRestaurant).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });

  describe('Idempotency & Duplicate Protection', () => {
    it('returns existing order if duplicate idempotency key is submitted', async () => {
      const existing = { id: 'ord-existing', orderNumber: 'ORD-001', status: OrderStatus.PENDING };
      mockPrisma.order.findUnique.mockResolvedValue(existing);

      const res = await service.submitOrder(
        {
          tableSessionId: 'sess-1',
          idempotencyKey: '00000000-0000-0000-0000-000000000001',
          items: [{ menuItemId: 'item-1', quantity: 1, selectedModifierOptionIds: [] }],
        },
        'rest-1',
      );

      expect(res).toEqual(existing);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('Table Session Validation', () => {
    it('throws BadRequestException if session is not OPEN or ACTIVE', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      mockPrisma.tableSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        restaurantId: 'rest-1',
        status: TableSessionStatus.CLOSED,
        table: { id: 'tbl-1' },
      });

      await expect(
        service.submitOrder(
          {
            tableSessionId: 'sess-1',
            idempotencyKey: '00000000-0000-0000-0000-000000000002',
            items: [{ menuItemId: 'item-1', quantity: 1, selectedModifierOptionIds: [] }],
          },
          'rest-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
