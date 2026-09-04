import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(restaurantId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: { restaurantId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where: { restaurantId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(customerId: string, restaurantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, restaurantId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { orderItems: true },
        },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findOrCreate(restaurantId: string, phone?: string, name?: string, email?: string) {
    if (phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { restaurantId, phone },
      });
      if (existing) {
        return this.prisma.customer.update({
          where: { id: existing.id },
          data: {
            visitCount: { increment: 1 },
            name: name || existing.name,
            email: email || existing.email,
          },
        });
      }
    }

    return this.prisma.customer.create({
      data: {
        restaurantId,
        phone: phone || null,
        name: name || null,
        email: email || null,
        isAnonymous: !phone && !email,
      },
    });
  }
}
