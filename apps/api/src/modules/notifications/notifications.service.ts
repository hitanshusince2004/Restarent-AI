import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventsGateway } from '../../gateway/events.gateway';
import { NotificationType, NotificationStatus, SocketEvent } from '@restaurant-os/types';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(
    restaurantId: string,
    type: NotificationType,
    title: string,
    message: string,
    targetUserId?: string,
    metadata?: Record<string, unknown>,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        restaurantId,
        type,
        status: NotificationStatus.SENT,
        title,
        message,
        targetUserId: targetUserId || null,
        metadata: metadata ? (metadata as never) : undefined,
        sentAt: new Date(),
      },
    });

    await this.eventsGateway.emitToRestaurant(restaurantId, SocketEvent.NOTIFICATION_CREATED, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    });

    return notification;
  }

  async findByRestaurant(restaurantId: string, targetUserId?: string) {
    return this.prisma.notification.findMany({
      where: {
        restaurantId,
        ...(targetUserId ? { OR: [{ targetUserId }, { targetUserId: null }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, restaurantId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, restaurantId },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
  }

  async markAllAsRead(restaurantId: string, targetUserId?: string) {
    return this.prisma.notification.updateMany({
      where: {
        restaurantId,
        ...(targetUserId ? { OR: [{ targetUserId }, { targetUserId: null }] } : {}),
        status: { not: NotificationStatus.READ },
      },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
  }
}
