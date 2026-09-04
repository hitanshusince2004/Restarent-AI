import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditAction } from '@restaurant-os/types';

interface LogAuditParams {
  actorId?: string;
  restaurantId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an audit log entry. Fire-and-forget — does not throw.
   * Audit logging failure must never break business logic.
   */
  async log(params: LogAuditParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId || null,
          restaurantId: params.restaurantId || null,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId || null,
          metadata: params.metadata ? (params.metadata as never) : undefined,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent?.substring(0, 500) || null,
        },
      });
    } catch (error) {
      // Never fail business logic due to audit logging
      this.logger.error({
        msg: 'Failed to write audit log',
        action: params.action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async findByRestaurant(
    restaurantId: string,
    options: { page: number; limit: number; action?: AuditAction },
  ) {
    const { page, limit, action } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          restaurantId,
          ...(action ? { action } : {}),
        },
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({
        where: { restaurantId, ...(action ? { action } : {}) },
      }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
