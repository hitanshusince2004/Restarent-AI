import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../../gateway/events.gateway';
import {
  TableSessionStatus,
  TableStatus,
  SocketEvent,
  AuditAction,
} from '@restaurant-os/types';

@Injectable()
export class TableSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async openSession(
    tableId: string,
    restaurantId: string,
    guestCount?: number,
    openedBy?: string,
  ) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, outlet: { restaurantId } },
      include: { outlet: true },
    });

    if (!table) throw new NotFoundException('Table not found');

    // Check if table already has an active session
    const existing = await this.prisma.tableSession.findFirst({
      where: {
        tableId,
        status: { in: [TableSessionStatus.OPEN, TableSessionStatus.ACTIVE, TableSessionStatus.BILLING] },
      },
    });

    if (existing) {
      throw new ConflictException('Table already has an active dining session');
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const newSession = await tx.tableSession.create({
        data: {
          tableId,
          outletId: table.outletId,
          restaurantId,
          status: TableSessionStatus.OPEN,
          guestCount: guestCount ?? null,
          openedBy: openedBy ?? null,
        },
      });

      await tx.table.update({
        where: { id: tableId },
        data: { status: TableStatus.OCCUPIED },
      });

      return newSession;
    });

    await this.eventsGateway.emitToRestaurant(restaurantId, SocketEvent.TABLE_SESSION_OPENED, {
      sessionId: session.id,
      tableId,
      tableName: table.name,
      status: session.status,
      restaurantId,
    });

    await this.auditService.log({
      actorId: openedBy,
      restaurantId,
      action: AuditAction.TABLE_SESSION_OPENED,
      resourceType: 'table_session',
      resourceId: session.id,
      metadata: { tableId, tableName: table.name, guestCount },
    });

    return session;
  }

  async getSession(sessionId: string, restaurantId: string) {
    const session = await this.prisma.tableSession.findFirst({
      where: { id: sessionId, restaurantId },
      include: {
        table: true,
        orders: {
          include: {
            orderItems: { include: { orderItemModifiers: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        bill: {
          include: { payments: true, discounts: true },
        },
      },
    });

    if (!session) throw new NotFoundException('Table session not found');
    return session;
  }

  async closeSession(sessionId: string, restaurantId: string, actorId: string) {
    const session = await this.prisma.tableSession.findFirst({
      where: { id: sessionId, restaurantId },
      include: { bill: true, table: true },
    });

    if (!session) throw new NotFoundException('Table session not found');

    if (session.status === TableSessionStatus.CLOSED) {
      throw new BadRequestException('Session is already closed');
    }

    // If bill exists, verify bill is paid before closing
    if (session.bill && session.bill.status !== 'PAID' && session.bill.status !== 'VOID') {
      throw new BadRequestException(
        `Cannot close session: Bill has unpaid balance of ₹${session.bill.balanceAmount.toString()}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const closedSession = await tx.tableSession.update({
        where: { id: sessionId },
        data: {
          status: TableSessionStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      await tx.table.update({
        where: { id: session.tableId },
        data: { status: TableStatus.AVAILABLE },
      });

      return closedSession;
    });

    await this.eventsGateway.emitToRestaurant(restaurantId, SocketEvent.TABLE_SESSION_CLOSED, {
      sessionId,
      tableId: session.tableId,
      status: TableSessionStatus.CLOSED,
      restaurantId,
    });

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.TABLE_SESSION_CLOSED,
      resourceType: 'table_session',
      resourceId: sessionId,
      metadata: { tableId: session.tableId },
    });

    return updated;
  }

  async updateStatus(
    sessionId: string,
    restaurantId: string,
    status: TableSessionStatus,
  ) {
    const session = await this.prisma.tableSession.findFirst({
      where: { id: sessionId, restaurantId },
    });

    if (!session) throw new NotFoundException('Session not found');

    const updated = await this.prisma.tableSession.update({
      where: { id: sessionId },
      data: { status },
    });

    await this.eventsGateway.emitToSession(sessionId, SocketEvent.TABLE_SESSION_UPDATED, {
      sessionId,
      status,
    });

    return updated;
  }
}
