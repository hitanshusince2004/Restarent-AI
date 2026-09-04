import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@restaurant-os/types';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getSettings(restaurantId: string) {
    const settings = await this.prisma.setting.findMany({
      where: { restaurantId },
    });

    const record: Record<string, string> = {};
    for (const s of settings) {
      record[s.key] = s.value;
    }
    return record;
  }

  async updateSettings(
    restaurantId: string,
    settings: Record<string, string>,
    actorId: string,
  ) {
    const operations = Object.entries(settings).map(([key, value]) =>
      this.prisma.setting.upsert({
        where: { restaurantId_key: { restaurantId, key } },
        create: { restaurantId, key, value },
        update: { value },
      }),
    );

    await this.prisma.$transaction(operations);

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.RESTAURANT_SETTINGS_CHANGED,
      resourceType: 'settings',
      metadata: { keys: Object.keys(settings) },
    });

    return this.getSettings(restaurantId);
  }
}
