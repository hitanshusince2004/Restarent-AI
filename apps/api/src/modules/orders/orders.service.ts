import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../../gateway/events.gateway';
import { SubmitOrderDto, CartItemDto } from '@restaurant-os/validation';
import {
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
  OrderEventType,
  AuditAction,
  SocketEvent,
  TableSessionStatus,
  MenuItemStatus,
} from '@restaurant-os/types';
import { Decimal } from '@prisma/client/runtime/library';
import Decimal_ from 'decimal.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Submit an order from a customer's cart.
   *
   * Security guarantees:
   * - Idempotency key prevents duplicate submissions
   * - All prices fetched from DB — never trusted from client
   * - Item existence, ownership, and availability validated server-side
   * - Table session validity enforced
   * - All totals calculated server-side using Decimal arithmetic
   */
  async submitOrder(dto: SubmitOrderDto, restaurantId: string, customerId?: string) {
    // ─────────────────────────────────────────────
    // 1. Idempotency check — prevent duplicate orders
    // ─────────────────────────────────────────────
    const existingOrder = await this.prisma.order.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      select: { id: true, orderNumber: true, status: true },
    });

    if (existingOrder) {
      this.logger.log({
        msg: 'Duplicate order submission — returning existing order',
        orderId: existingOrder.id,
        idempotencyKey: dto.idempotencyKey,
      });
      return existingOrder;
    }

    // ─────────────────────────────────────────────
    // 2. Validate table session
    // ─────────────────────────────────────────────
    const session = await this.prisma.tableSession.findUnique({
      where: { id: dto.tableSessionId },
      include: { table: true },
    });

    if (!session) {
      throw new NotFoundException('Table session not found');
    }

    if (session.restaurantId !== restaurantId) {
      throw new BadRequestException('Table session does not belong to this restaurant');
    }

    if (
      session.status !== TableSessionStatus.OPEN &&
      session.status !== TableSessionStatus.ACTIVE
    ) {
      throw new BadRequestException(
        `Cannot place order — table session is ${session.status}. Session must be OPEN or ACTIVE.`,
      );
    }

    // ─────────────────────────────────────────────
    // 3. Validate all items + calculate totals server-side
    // ─────────────────────────────────────────────
    const validatedItems = await this.validateAndPriceItems(dto.items, restaurantId);

    // Calculate totals with Decimal arithmetic (no floating-point errors)
    let subtotal = new Decimal_(0);
    let taxTotal = new Decimal_(0);

    for (const item of validatedItems) {
      subtotal = subtotal.plus(item.lineTotal);
      taxTotal = taxTotal.plus(item.lineTax);
    }

    const grandTotal = subtotal.plus(taxTotal);

    // ─────────────────────────────────────────────
    // 4. Create order in transaction
    // ─────────────────────────────────────────────
    const orderNumber = await this.generateOrderNumber(restaurantId);

    const order = await this.prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          tableSessionId: dto.tableSessionId,
          tableId: session.tableId,
          outletId: session.outletId,
          restaurantId,
          customerId: customerId || null,
          status: OrderStatus.PENDING,
          notes: dto.notes || null,
          idempotencyKey: dto.idempotencyKey,
          subtotal: subtotal.toFixed(4),
          taxTotal: taxTotal.toFixed(4),
          grandTotal: grandTotal.toFixed(4),
        },
      });

      // Create order items with price snapshots
      for (const item of validatedItems) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            menuItemId: item.menuItemId,
            variantId: item.variantId || null,
            itemName: item.itemName,
            variantName: item.variantName || null,
            unitPrice: item.unitPrice.toFixed(4),
            taxRate: item.taxRate,
            quantity: item.quantity,
            notes: item.notes || null,
            lineTotal: item.lineTotal.toFixed(4),
            lineTax: item.lineTax.toFixed(4),
            lineGrandTotal: item.lineGrandTotal.toFixed(4),
          },
        });

        // Create modifier snapshots
        if (item.modifiers.length > 0) {
          await tx.orderItemModifier.createMany({
            data: item.modifiers.map((mod) => ({
              orderItemId: orderItem.id,
              modifierOptionId: mod.optionId,
              optionName: mod.optionName,
              groupName: mod.groupName,
              additionalPrice: mod.additionalPrice.toFixed(4),
            })),
          });
        }
      }

      // Create order event (audit trail)
      await tx.orderEvent.create({
        data: {
          orderId: newOrder.id,
          eventType: OrderEventType.CREATED,
          actorType: customerId ? 'customer' : 'system',
          actorId: customerId || null,
          toStatus: OrderStatus.PENDING,
          metadata: { itemCount: validatedItems.length, grandTotal: grandTotal.toFixed(2) },
        },
      });

      // Activate session if it was OPEN
      if (session.status === TableSessionStatus.OPEN) {
        await tx.tableSession.update({
          where: { id: dto.tableSessionId },
          data: { status: TableSessionStatus.ACTIVE },
        });
      }

      return newOrder;
    });

    // ─────────────────────────────────────────────
    // 5. Create kitchen ticket
    // ─────────────────────────────────────────────
    await this.prisma.kitchenTicket.create({
      data: {
        orderId: order.id,
        restaurantId,
        outletId: session.outletId,
        tableSessionId: dto.tableSessionId,
        notes: dto.notes || null,
      },
    });

    // ─────────────────────────────────────────────
    // 6. Update / create bill
    // ─────────────────────────────────────────────
    await this.upsertBill(dto.tableSessionId, restaurantId, session.outletId, order);

    // ─────────────────────────────────────────────
    // 7. Emit real-time events
    // ─────────────────────────────────────────────
    await this.eventsGateway.emitToRestaurant(restaurantId, SocketEvent.ORDER_CREATED, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableSessionId: dto.tableSessionId,
      tableId: session.tableId,
      outletId: session.outletId,
      restaurantId,
      status: OrderStatus.PENDING,
      grandTotal: grandTotal.toFixed(2),
      itemCount: validatedItems.length,
    });

    await this.auditService.log({
      restaurantId,
      action: AuditAction.ORDER_CREATED,
      resourceType: 'order',
      resourceId: order.id,
      actorId: customerId,
      metadata: { orderNumber, grandTotal: grandTotal.toFixed(2) },
    });

    this.logger.log({ msg: 'Order submitted', orderId: order.id, orderNumber, restaurantId });

    return this.findOne(order.id, restaurantId);
  }

  /**
   * Update order status with state machine validation.
   */
  async updateStatus(
    orderId: string,
    restaurantId: string,
    newStatus: OrderStatus,
    actorId: string,
    reason?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      select: { id: true, status: true, tableSessionId: true, outletId: true, orderNumber: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Enforce state machine
    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes(newStatus)) {
      throw new UnprocessableEntityException(
        `Cannot transition order from ${order.status} to ${newStatus}. ` +
          `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
      );
    }

    const now = new Date();
    const timestamps: Record<string, Date> = {};
    if (newStatus === OrderStatus.ACCEPTED) timestamps.acceptedAt = now;
    if (newStatus === OrderStatus.PREPARING) timestamps.preparedAt = now;
    if (newStatus === OrderStatus.READY) timestamps.readyAt = now;
    if (newStatus === OrderStatus.SERVED) timestamps.servedAt = now;
    if (newStatus === OrderStatus.COMPLETED) timestamps.completedAt = now;
    if (newStatus === OrderStatus.CANCELLED) timestamps.cancelledAt = now;

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          cancellationReason: newStatus === OrderStatus.CANCELLED ? (reason || null) : undefined,
          ...timestamps,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          eventType: OrderEventType.STATUS_CHANGED,
          actorId,
          actorType: 'staff',
          fromStatus: order.status,
          toStatus: newStatus,
          metadata: { reason },
        },
      });

      return updated;
    });

    // Update kitchen ticket status in sync
    await this.syncKitchenTicketStatus(orderId, newStatus);

    // Emit real-time event
    const eventMap: Partial<Record<OrderStatus, SocketEvent>> = {
      [OrderStatus.ACCEPTED]: SocketEvent.ORDER_ACCEPTED,
      [OrderStatus.PREPARING]: SocketEvent.ORDER_PREPARING,
      [OrderStatus.READY]: SocketEvent.ORDER_READY,
      [OrderStatus.SERVED]: SocketEvent.ORDER_SERVED,
      [OrderStatus.COMPLETED]: SocketEvent.ORDER_COMPLETED,
      [OrderStatus.CANCELLED]: SocketEvent.ORDER_CANCELLED,
    };

    const event = eventMap[newStatus];
    if (event) {
      await this.eventsGateway.emitToRestaurant(restaurantId, event, {
        orderId,
        orderNumber: order.orderNumber,
        status: newStatus,
        tableSessionId: order.tableSessionId,
        outletId: order.outletId,
        restaurantId,
      });
    }

    await this.auditService.log({
      restaurantId,
      actorId,
      action: AuditAction.ORDER_STATUS_CHANGED,
      resourceType: 'order',
      resourceId: orderId,
      metadata: { from: order.status, to: newStatus, reason },
    });

    return updatedOrder;
  }

  async findBySession(tableSessionId: string, restaurantId: string) {
    return this.prisma.order.findMany({
      where: { tableSessionId, restaurantId },
      include: {
        orderItems: {
          include: { orderItemModifiers: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(orderId: string, restaurantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        orderItems: { include: { orderItemModifiers: true } },
        orderEvents: { orderBy: { createdAt: 'asc' } },
        kitchenTickets: true,
        table: { select: { name: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findByRestaurant(
    restaurantId: string,
    options: { page: number; limit: number; status?: OrderStatus; outletId?: string },
  ) {
    const { page, limit, status, outletId } = options;
    const skip = (page - 1) * limit;

    const where = {
      restaurantId,
      ...(status ? { status } : {}),
      ...(outletId ? { outletId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          orderItems: { include: { orderItemModifiers: true } },
          table: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private async validateAndPriceItems(
    cartItems: CartItemDto[],
    restaurantId: string,
  ) {
    const results = [];

    for (const cartItem of cartItems) {
      // Fetch menu item from DB — NEVER trust client price
      const menuItem = await this.prisma.menuItem.findFirst({
        where: {
          id: cartItem.menuItemId,
          restaurantId, // tenant isolation
          deletedAt: null,
        },
        include: {
          variants: true,
          modifierGroups: {
            include: {
              modifierGroup: { include: { options: true } },
            },
          },
        },
      });

      if (!menuItem) {
        throw new BadRequestException(`Menu item ${cartItem.menuItemId} not found or unavailable`);
      }

      if (menuItem.status !== MenuItemStatus.ACTIVE) {
        throw new BadRequestException(
          `Menu item "${menuItem.name}" is currently ${menuItem.status.toLowerCase().replace('_', ' ')}`,
        );
      }

      // Determine base price (variant or item base price)
      let unitPrice = new Decimal_(menuItem.basePrice.toString());
      let variantName: string | null = null;

      if (cartItem.variantId) {
        const variant = menuItem.variants.find(
          (v) => v.id === cartItem.variantId && v.isActive,
        );
        if (!variant) {
          throw new BadRequestException(
            `Variant ${cartItem.variantId} not found for item "${menuItem.name}"`,
          );
        }
        unitPrice = new Decimal_(variant.price.toString());
        variantName = variant.name;
      } else {
        // If item has variants and no variant selected, use default or first active
        const defaultVariant = menuItem.variants.find((v) => v.isDefault && v.isActive);
        if (defaultVariant && menuItem.variants.length > 0) {
          unitPrice = new Decimal_(defaultVariant.price.toString());
          variantName = defaultVariant.name;
        }
      }

      // Validate and price modifiers
      const modifierResults = [];
      let modifierTotal = new Decimal_(0);

      for (const optionId of cartItem.selectedModifierOptionIds || []) {
        let foundOption = null;
        for (const mg of menuItem.modifierGroups) {
          foundOption = mg.modifierGroup.options.find(
            (o) => o.id === optionId && o.isActive,
          );
          if (foundOption) {
            modifierResults.push({
              optionId: foundOption.id,
              optionName: foundOption.name,
              groupName: mg.modifierGroup.name,
              additionalPrice: new Decimal_(foundOption.additionalPrice.toString()),
            });
            modifierTotal = modifierTotal.plus(foundOption.additionalPrice.toString());
            break;
          }
        }

        if (!foundOption) {
          throw new BadRequestException(
            `Modifier option ${optionId} not found or unavailable for item "${menuItem.name}"`,
          );
        }
      }

      // Validate required modifier groups
      for (const mg of menuItem.modifierGroups) {
        if (mg.modifierGroup.isRequired) {
          const selectedCount = cartItem.selectedModifierOptionIds?.filter((id) =>
            mg.modifierGroup.options.some((o) => o.id === id),
          ).length || 0;

          if (selectedCount < mg.modifierGroup.minSelections) {
            throw new BadRequestException(
              `Item "${menuItem.name}" requires at least ${mg.modifierGroup.minSelections} selection(s) from "${mg.modifierGroup.name}"`,
            );
          }
        }
      }

      // Calculate per-item totals
      const effectiveUnitPrice = unitPrice.plus(modifierTotal);
      const lineTotal = effectiveUnitPrice.mul(cartItem.quantity);
      const taxRate = Number(menuItem.taxRate);
      const lineTax = lineTotal.mul(taxRate).div(100);
      const lineGrandTotal = lineTotal.plus(lineTax);

      results.push({
        menuItemId: menuItem.id,
        variantId: cartItem.variantId || null,
        itemName: menuItem.name,
        variantName,
        unitPrice: effectiveUnitPrice,
        taxRate,
        quantity: cartItem.quantity,
        notes: cartItem.notes || null,
        lineTotal,
        lineTax,
        lineGrandTotal,
        modifiers: modifierResults,
      });
    }

    return results;
  }

  private async generateOrderNumber(restaurantId: string): Promise<string> {
    // Count today's orders for this restaurant to generate sequential number
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await this.prisma.order.count({
      where: {
        restaurantId,
        createdAt: { gte: today },
      },
    });

    const dateStr = new Date()
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, ''); // YYMMDD
    return `ORD-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  private async upsertBill(
    tableSessionId: string,
    restaurantId: string,
    outletId: string,
    order: { id: string; orderNumber: string; subtotal: Decimal; taxTotal: Decimal; grandTotal: Decimal },
  ) {
    await this.prisma.$transaction(async (tx) => {
      const orderSubtotal = new Decimal_(order.subtotal.toString());
      const orderTax = new Decimal_(order.taxTotal.toString());
      const orderTotal = new Decimal_(order.grandTotal.toString());

      // Get or create bill
      let bill = await tx.bill.findUnique({ where: { tableSessionId } });

      if (!bill) {
        bill = await tx.bill.create({
          data: {
            tableSessionId,
            restaurantId,
            outletId,
            subtotal: orderSubtotal.toFixed(4),
            taxTotal: orderTax.toFixed(4),
            grandTotal: orderTotal.toFixed(4),
            balanceAmount: orderTotal.toFixed(4),
            paidAmount: '0.0000',
            discountTotal: '0.0000',
            roundingAdjustment: '0.0000',
          },
        });
      } else {
        // Add to existing bill
        const newSubtotal = new Decimal_(bill.subtotal.toString()).plus(orderSubtotal);
        const newTax = new Decimal_(bill.taxTotal.toString()).plus(orderTax);
        const newDiscount = new Decimal_(bill.discountTotal.toString());
        const newGrandTotal = newSubtotal.plus(newTax).minus(newDiscount);
        const newBalance = newGrandTotal.minus(new Decimal_(bill.paidAmount.toString()));

        bill = await tx.bill.update({
          where: { id: bill.id },
          data: {
            subtotal: newSubtotal.toFixed(4),
            taxTotal: newTax.toFixed(4),
            grandTotal: newGrandTotal.toFixed(4),
            balanceAmount: newBalance.toFixed(4),
          },
        });
      }

      // Add bill item (order-level summary)
      await tx.billItem.upsert({
        where: { billId_orderId: { billId: bill.id, orderId: order.id } },
        create: {
          billId: bill.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderSubtotal: orderSubtotal.toFixed(4),
          orderTax: orderTax.toFixed(4),
          orderTotal: orderTotal.toFixed(4),
        },
        update: {},
      });

      // Emit bill update
      await this.eventsGateway.emitToSession(tableSessionId, SocketEvent.BILL_UPDATED, {
        billId: bill.id,
        tableSessionId,
        restaurantId,
        grandTotal: bill.grandTotal.toString(),
        paidAmount: bill.paidAmount.toString(),
        balanceAmount: bill.balanceAmount.toString(),
        status: bill.status,
      });
    });
  }

  private async syncKitchenTicketStatus(orderId: string, orderStatus: OrderStatus): Promise<void> {
    const statusMap: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.ACCEPTED]: 'ACKNOWLEDGED',
      [OrderStatus.PREPARING]: 'PREPARING',
      [OrderStatus.READY]: 'READY',
      [OrderStatus.COMPLETED]: 'COMPLETED',
    };

    const kitchenStatus = statusMap[orderStatus];
    if (kitchenStatus) {
      await this.prisma.kitchenTicket.updateMany({
        where: { orderId },
        data: { status: kitchenStatus as never },
      });
    }
  }
}
