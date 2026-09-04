import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOutletDto, UpdateOutletDto } from '@restaurant-os/validation';
import { AuditService } from '../audit/audit.service';
import { AuditAction, OutletStatus } from '@restaurant-os/types';

@Injectable()
export class OutletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(restaurantId: string, dto: CreateOutletDto, actorId: string) {
    const outlet = await this.prisma.outlet.create({
      data: {
        restaurantId,
        name: dto.name,
        address: dto.address || null,
        phone: dto.phone || null,
        openingTime: dto.openingTime || null,
        closingTime: dto.closingTime || null,
        status: OutletStatus.ACTIVE,
      },
    });

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.OUTLET_CREATED,
      resourceType: 'outlet',
      resourceId: outlet.id,
      metadata: { name: outlet.name },
    });

    return outlet;
  }

  async findAll(restaurantId: string) {
    return this.prisma.outlet.findMany({
      where: { restaurantId },
      include: {
        _count: {
          select: { tables: true, floors: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(outletId: string, restaurantId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, restaurantId },
      include: {
        floors: {
          orderBy: { displayOrder: 'asc' },
          include: { tables: true },
        },
        tables: {
          include: { qrCodes: { where: { status: 'ACTIVE' } } },
        },
      },
    });

    if (!outlet) throw new NotFoundException('Outlet not found');
    return outlet;
  }

  async update(outletId: string, restaurantId: string, dto: UpdateOutletDto, actorId: string) {
    const existing = await this.prisma.outlet.findFirst({
      where: { id: outletId, restaurantId },
    });
    if (!existing) throw new NotFoundException('Outlet not found');

    const updated = await this.prisma.outlet.update({
      where: { id: outletId },
      data: dto,
    });

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.RESTAURANT_SETTINGS_CHANGED,
      resourceType: 'outlet',
      resourceId: outletId,
      metadata: { updatedFields: Object.keys(dto) },
    });

    return updated;
  }
}
