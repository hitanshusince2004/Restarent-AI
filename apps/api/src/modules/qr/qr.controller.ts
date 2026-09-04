import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QrService } from './qr.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { RequirePermissions, Public } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Permission } from '@restaurant-os/types';
import { Throttle } from '@nestjs/throttler';

@ApiTags('QR')
@Controller({ path: 'qr', version: '1' })
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('resolve/:token')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @ApiOperation({ summary: 'Resolve public QR code token to table session context (Customer entry point)' })
  async resolveToken(@Param('token') token: string) {
    return this.qrService.resolveToken(token);
  }

  @Post('tables/:tableId/generate')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.QR_GENERATE)
  @ApiOperation({ summary: 'Generate or regenerate a stable QR code for a table' })
  async generateForTable(
    @Param('tableId') tableId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    // Note: restaurantId will be checked within the service via the user's permissions
    return this.qrService.generateForTable(tableId, user.sub, user.sub);
  }

  @Post('tables/:tableId/revoke')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.QR_REVOKE)
  @ApiOperation({ summary: 'Revoke active QR code for a table' })
  async revokeForTable(
    @Param('tableId') tableId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.qrService.revokeForTable(tableId, user.sub, user.sub);
  }
}
