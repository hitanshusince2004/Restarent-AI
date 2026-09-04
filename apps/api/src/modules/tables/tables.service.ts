import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTableDto, UpdateTableDto, updateTablePositionSchema } from '@restaurant-os/validation';
import { AuditService } from '../audit/audit.service';
import { AuditAction, TableStatus } from '@restaurant-os/types';

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(outletId: string, restaurantId: string, dto: CreateTableDto, actorId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, restaurantId },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');

    const table = await this.prisma.table.create({
      data: {
        outletId,
        name: dto.name,
        capacity: dto.capacity,
        floorId: dto.floorId || null,
        positionX: dto.positionX ?? null,
        positionY: dto.positionY ?? null,
        width: dto.width ?? null,
        height: dto.height ?? null,
        status: TableStatus.AVAILABLE,
      },
      include: { floor: true, qrCodes: true },
    });

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.TABLE_CREATED,
      resourceType: 'table',
      resourceId: table.id,
      metadata: { name: table.name, capacity: table.capacity },
    });

    return table;
  }

  async findAll(outletId: string, restaurantId: string) {
    return this.prisma.table.findMany({
      where: { outletId, outlet: { restaurantId } },
      include: {
        floor: { select: { id: true, name: true } },
        qrCodes: { where: { status: 'ACTIVE' }, take: 1 },
        tableSessions: {
          where: { status: { in: ['OPEN', 'ACTIVE', 'BILLING'] } },
          take: 1,
          include: {
            orders: {
              where: { status: { not: 'CANCELLED' } },
              select: { id: true, orderNumber: true, status: true, grandTotal: true },
            },
            bill: { select: { grandTotal: true, paidAmount: true, status: true } },
          },
        },
      },
      orderBy: [{ floorId: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(tableId: string, restaurantId: string) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, outlet: { restaurantId } },
      include: {
        floor: true,
        qrCodes: { where: { status: 'ACTIVE' } },
        tableSessions: {
          orderBy: { openedAt: 'desc' },
          take: 5,
          include: {
            orders: { include: { orderItems: true } },
            bill: true,
          },
        },
      },
    });

    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  async update(tableId: string, restaurantId: string, dto: UpdateTableDto) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, outlet: { restaurantId } },
    });
    if (!table) throw new NotFoundException('Table not found');

    return this.prisma.table.update({
      where: { id: tableId },
      data: dto,
    });
  }

  async updatePosition(tableId: string, restaurantId: string, positionX: number, positionY: number) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, outlet: { restaurantId } },
    });
    if (!table) throw new NotFoundException('Table not found');

    return this.prisma.table.update({
      where: { id: tableId },
      data: { positionX, positionY },
    });
  }

  async delete(tableId: string, restaurantId: string) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, outlet: { restaurantId } },
      include: {
        tableSessions: { where: { status: { in: ['OPEN', 'ACTIVE', 'BILLING'] } } },
      },
    });
    if (!table) throw new NotFoundException('Table not found');

    if (table.tableSessions.length > 0) {
      throw new NotFoundException('Cannot delete table with active sessions');
    }

    return this.prisma.table.delete({ where: { id: tableId } });
  }
}
