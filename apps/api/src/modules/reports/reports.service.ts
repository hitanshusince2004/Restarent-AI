import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDailyOverview(restaurantId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [orders, sessions, payments] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        where: {
          restaurantId,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        _count: { id: true },
        _sum: { grandTotal: true },
      }),
      this.prisma.tableSession.count({
        where: { restaurantId, openedAt: { gte: startOfDay, lte: endOfDay } },
      }),
      this.prisma.payment.aggregate({
        where: {
          restaurantId,
          status: 'COMPLETED',
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalOrders = orders.reduce((sum, g) => sum + g._count.id, 0);
    const completedOrders = orders.find((g) => g.status === 'COMPLETED')?._count.id ?? 0;
    const cancelledOrders = orders.find((g) => g.status === 'CANCELLED')?._count.id ?? 0;
    const totalRevenue = payments._sum.amount?.toString() ?? '0';
    const avgOrderValue =
      completedOrders > 0
        ? (parseFloat(totalRevenue) / completedOrders).toFixed(2)
        : '0.00';

    return {
      date: targetDate.toISOString().split('T')[0],
      restaurantId,
      totalOrders,
      completedOrders,
      cancelledOrders,
      pendingOrders: orders.find((g) => g.status === 'PENDING')?._count.id ?? 0,
      totalRevenue,
      averageOrderValue: avgOrderValue,
      uniqueTableSessions: sessions,
      totalPayments: payments._count.id,
    };
  }

  async getTopItems(restaurantId: string, days = 7, limit = 10) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const topItems = await this.prisma.orderItem.groupBy({
      by: ['menuItemId', 'itemName'],
      where: {
        order: {
          restaurantId,
          status: { in: ['COMPLETED', 'SERVED'] },
          createdAt: { gte: since },
        },
      },
      _count: { id: true },
      _sum: { quantity: true, lineGrandTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    return topItems.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.itemName,
      orderCount: item._count.id,
      totalQuantity: item._sum.quantity ?? 0,
      totalRevenue: item._sum.lineGrandTotal?.toString() ?? '0',
    }));
  }

  async getHourlyOrders(restaurantId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' },
      },
      select: { createdAt: true, grandTotal: true },
    });

    // Group by hour
    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      orderCount: 0,
      revenue: '0',
    }));

    for (const order of orders) {
      const hour = order.createdAt.getHours();
      hourly[hour].orderCount++;
      hourly[hour].revenue = (
        parseFloat(hourly[hour].revenue) + parseFloat(order.grandTotal.toString())
      ).toFixed(2);
    }

    return hourly;
  }

  async getActiveTables(restaurantId: string) {
    return this.prisma.tableSession.findMany({
      where: {
        restaurantId,
        status: { in: ['OPEN', 'ACTIVE', 'BILLING'] },
      },
      include: {
        table: { select: { name: true, capacity: true } },
        bill: { select: { grandTotal: true, paidAmount: true, status: true } },
        orders: {
          where: { status: { not: 'CANCELLED' } },
          select: { status: true, grandTotal: true },
        },
        _count: { select: { orders: true } },
      },
      orderBy: { openedAt: 'asc' },
    });
  }
}
