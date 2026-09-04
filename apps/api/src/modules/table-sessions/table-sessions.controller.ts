import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TableSessionsService } from './table-sessions.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { RequirePermissions, Public } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Permission } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { openTableSessionSchema } from '@restaurant-os/validation';

@ApiTags('Table Sessions')
@Controller({ path: 'restaurants/:restaurantId/table-sessions', version: '1' })
export class TableSessionsController {
  constructor(private readonly tableSessionsService: TableSessionsService) {}

  @Post('tables/:tableId/open')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.ORDERS_CREATE)
  @ApiOperation({ summary: 'Open a new dining session for a table' })
  async openSession(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
    @Body(new ZodValidationPipe(openTableSessionSchema)) body: ReturnType<typeof openTableSessionSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tableSessionsService.openSession(tableId, restaurantId, body.guestCount ?? undefined, user.sub);
  }

  @Get(':sessionId')
  @Public()
  @ApiOperation({ summary: 'Get table session details with orders and bill' })
  async getSession(
    @Param('restaurantId') restaurantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.tableSessionsService.getSession(sessionId, restaurantId);
  }

  @Post(':sessionId/close')
  @ApiBearerAuth('JWT')
  @RequirePermissions(Permission.BILLING_UPDATE)
  @ApiOperation({ summary: 'Close table session after bill is settled' })
  async closeSession(
    @Param('restaurantId') restaurantId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tableSessionsService.closeSession(sessionId, restaurantId, user.sub);
  }
}
