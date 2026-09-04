import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFloorDto, UpdateFloorDto } from '@restaurant-os/validation';

@Injectable()
export class FloorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(outletId: string, restaurantId: string, dto: CreateFloorDto) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, restaurantId },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');

    return this.prisma.floor.create({
      data: {
        outletId,
        name: dto.name,
        displayOrder: dto.displayOrder ?? 0,
      },
      include: { tables: true },
    });
  }

  async findAll(outletId: string, restaurantId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, restaurantId },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');

    return this.prisma.floor.findMany({
      where: { outletId },
      include: {
        tables: {
          include: {
            qrCodes: { where: { status: 'ACTIVE' }, take: 1 },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async update(floorId: string, restaurantId: string, dto: UpdateFloorDto) {
    const floor = await this.prisma.floor.findFirst({
      where: { id: floorId, outlet: { restaurantId } },
    });
    if (!floor) throw new NotFoundException('Floor not found');

    return this.prisma.floor.update({
      where: { id: floorId },
      data: dto,
    });
  }

  async delete(floorId: string, restaurantId: string) {
    const floor = await this.prisma.floor.findFirst({
      where: { id: floorId, outlet: { restaurantId } },
      include: { _count: { select: { tables: true } } },
    });
    if (!floor) throw new NotFoundException('Floor not found');

    return this.prisma.floor.delete({
      where: { id: floorId },
    });
  }
}
