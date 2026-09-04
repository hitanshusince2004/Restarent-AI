import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';
import { AuditAction, QrCodeStatus, TableSessionStatus } from '@restaurant-os/types';

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);
  private readonly webUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    this.webUrl = configService.get<string>('WEB_URL', 'http://localhost:3000');
  }

  /**
   * Generate a new QR code for a table.
   * Revokes any existing active QR for the table.
   * Token: 32 bytes of cryptographically random data in base64url encoding.
   * URL: {WEB_URL}/t/{token} — backend resolves everything from the token.
   */
  async generateForTable(tableId: string, restaurantId: string, actorId: string) {
    // Verify table belongs to restaurant
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, outlet: { restaurantId } },
      include: { outlet: { select: { restaurantId: true } } },
    });

    if (!table) throw new NotFoundException('Table not found for this restaurant');

    // Revoke existing active QR
    await this.prisma.tableQrCode.updateMany({
      where: { tableId, status: QrCodeStatus.ACTIVE },
      data: { status: QrCodeStatus.REVOKED, revokedAt: new Date(), revokedBy: actorId },
    });

    // Generate new token
    const token = randomBytes(32).toString('base64url');
    const qrUrl = `${this.webUrl}/t/${token}`;

    // Generate QR image as base64 data URL
    const qrImageDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    });

    const qrCode = await this.prisma.tableQrCode.create({
      data: {
        tableId,
        token,
        status: QrCodeStatus.ACTIVE,
        qrImageUrl: qrImageDataUrl,
      },
      include: { table: { select: { name: true, outletId: true } } },
    });

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.QR_REGENERATED,
      resourceType: 'qr_code',
      resourceId: qrCode.id,
      metadata: { tableId, tableName: qrCode.table.name },
    });

    this.logger.log({ msg: 'QR code generated', tableId, token: token.substring(0, 8) + '...' });

    return { ...qrCode, qrUrl };
  }

  /**
   * Resolve a QR token to restaurant/outlet/table context.
   * This is called when a customer scans a QR code.
   * Rate limiting applied at controller level.
   */
  async resolveToken(token: string) {
    const qrCode = await this.prisma.tableQrCode.findUnique({
      where: { token },
      include: {
        table: {
          include: {
            outlet: {
              include: {
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    logoUrl: true,
                    currency: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!qrCode) {
      throw new NotFoundException('Invalid QR code');
    }

    if (qrCode.status === QrCodeStatus.REVOKED) {
      throw new BadRequestException(
        'This QR code has been revoked. Please ask staff for a new QR code.',
      );
    }

    if (qrCode.status === QrCodeStatus.EXPIRED) {
      throw new BadRequestException('This QR code has expired.');
    }

    if (qrCode.table.outlet.restaurant.status !== 'ACTIVE') {
      throw new BadRequestException('This restaurant is currently not accepting orders.');
    }

    // Find or create an active table session
    const session = await this.getOrCreateSession(
      qrCode.table.id,
      qrCode.table.outletId,
      qrCode.table.outlet.restaurantId,
    );

    return {
      restaurant: qrCode.table.outlet.restaurant,
      outlet: {
        id: qrCode.table.outlet.id,
        name: qrCode.table.outlet.name,
        isCurrentlyOpen: qrCode.table.outlet.isCurrentlyOpen,
      },
      table: {
        id: qrCode.table.id,
        name: qrCode.table.name,
        capacity: qrCode.table.capacity,
      },
      tableSession: session,
      qrCodeId: qrCode.id,
    };
  }

  async revokeForTable(tableId: string, restaurantId: string, actorId: string) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, outlet: { restaurantId } },
    });

    if (!table) throw new NotFoundException('Table not found');

    await this.prisma.tableQrCode.updateMany({
      where: { tableId, status: QrCodeStatus.ACTIVE },
      data: { status: QrCodeStatus.REVOKED, revokedAt: new Date(), revokedBy: actorId },
    });

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.QR_REVOKED,
      resourceType: 'qr_code',
      resourceId: tableId,
      metadata: { tableId },
    });
  }

  async getTableQrCodes(tableId: string, restaurantId: string) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, outlet: { restaurantId } },
      select: { id: true },
    });

    if (!table) throw new NotFoundException('Table not found');

    return this.prisma.tableQrCode.findMany({
      where: { tableId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getOrCreateSession(tableId: string, outletId: string, restaurantId: string) {
    // Look for an existing OPEN or ACTIVE session
    const existing = await this.prisma.tableSession.findFirst({
      where: {
        tableId,
        status: { in: [TableSessionStatus.OPEN, TableSessionStatus.ACTIVE] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) return existing;

    // Create new session
    return this.prisma.tableSession.create({
      data: {
        tableId,
        outletId,
        restaurantId,
        status: TableSessionStatus.OPEN,
        openedAt: new Date(),
      },
    });
  }
}
