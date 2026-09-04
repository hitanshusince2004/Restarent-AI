import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, PaymentStatus } from '@restaurant-os/types';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findPayments(
    restaurantId: string,
    options: { page: number; limit: number; status?: PaymentStatus; method?: string },
  ) {
    const { page, limit, status, method } = options;
    const skip = (page - 1) * limit;

    const where = {
      restaurantId,
      ...(status ? { status } : {}),
      ...(method ? { method: method as never } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          markedBy: { select: { id: true, name: true } },
          bill: {
            include: {
              tableSession: {
                include: { table: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(paymentId: string, restaurantId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, restaurantId },
      include: {
        markedBy: { select: { id: true, name: true, email: true } },
        bill: {
          include: {
            tableSession: { include: { table: true } },
            billItems: true,
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }
}
