import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../../gateway/events.gateway';
import {
  AuditAction,
  KitchenTicketStatus,
  KITCHEN_TICKET_TRANSITIONS,
  SocketEvent,
} from '@restaurant-os/types';
import { UpdateKitchenTicketDto } from '@restaurant-os/validation';

@Injectable()
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getActiveTickets(restaurantId: string, outletId?: string) {
    return this.prisma.kitchenTicket.findMany({
      where: {
        restaurantId,
        ...(outletId ? { outletId } : {}),
        status: { notIn: ['COMPLETED'] },
      },
      include: {
        order: {
          include: {
            orderItems: { include: { orderItemModifiers: true } },
            table: { select: { name: true } },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async updateTicketStatus(
    ticketId: string,
    restaurantId: string,
    dto: UpdateKitchenTicketDto,
    actorId: string,
  ) {
    const ticket = await this.prisma.kitchenTicket.findFirst({
      where: { id: ticketId, restaurantId },
    });

    if (!ticket) throw new NotFoundException('Kitchen ticket not found');

    const newStatus = dto.status as KitchenTicketStatus;
    const allowedTransitions = KITCHEN_TICKET_TRANSITIONS[ticket.status];

    if (!allowedTransitions.includes(newStatus)) {
      throw new UnprocessableEntityException(
        `Cannot transition kitchen ticket from ${ticket.status} to ${newStatus}`,
      );
    }

    const now = new Date();
    const timestamps: Record<string, Date> = {};
    if (newStatus === KitchenTicketStatus.ACKNOWLEDGED) timestamps.acknowledgedAt = now;
    if (newStatus === KitchenTicketStatus.PREPARING) timestamps.preparingAt = now;
    if (newStatus === KitchenTicketStatus.READY) timestamps.readyAt = now;
    if (newStatus === KitchenTicketStatus.COMPLETED) timestamps.completedAt = now;

    const updatedTicket = await this.prisma.kitchenTicket.update({
      where: { id: ticketId },
      data: { status: newStatus, ...timestamps, notes: dto.notes ?? ticket.notes },
      include: {
        order: { include: { table: { select: { name: true } }, orderItems: true } },
      },
    });

    // Emit to restaurant dashboard and kitchen
    await this.eventsGateway.emitToRestaurant(restaurantId, SocketEvent.KITCHEN_TICKET_UPDATED, {
      ticketId,
      orderId: ticket.orderId,
      status: newStatus,
      restaurantId,
      outletId: ticket.outletId,
    });

    await this.eventsGateway.emitToKitchen(ticket.outletId, SocketEvent.KITCHEN_TICKET_UPDATED, {
      ticketId,
      orderId: ticket.orderId,
      status: newStatus,
      restaurantId,
      outletId: ticket.outletId,
    });

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.ORDER_STATUS_CHANGED,
      resourceType: 'kitchen_ticket',
      resourceId: ticketId,
      metadata: { fromStatus: ticket.status, toStatus: newStatus },
    });

    return updatedTicket;
  }
}
