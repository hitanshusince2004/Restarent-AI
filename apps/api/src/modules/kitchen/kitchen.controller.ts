import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KitchenService } from './kitchen.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Permission } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { updateKitchenTicketSchema } from '@restaurant-os/validation';

@ApiTags('Kitchen')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/kitchen', version: '1' })
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('tickets')
  @RequirePermissions(Permission.KITCHEN_READ)
  @ApiOperation({ summary: 'Get all active kitchen tickets (KDS view)' })
  async getActiveTickets(
    @Param('restaurantId') restaurantId: string,
    @Query('outletId') outletId?: string,
  ) {
    return this.kitchenService.getActiveTickets(restaurantId, outletId);
  }

  @Patch('tickets/:ticketId')
  @RequirePermissions(Permission.KITCHEN_UPDATE)
  @ApiOperation({ summary: 'Update kitchen ticket status (ACKNOWLEDGED, PREPARING, READY, COMPLETED)' })
  async updateTicketStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('ticketId') ticketId: string,
    @Body(new ZodValidationPipe(updateKitchenTicketSchema)) body: ReturnType<typeof updateKitchenTicketSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.kitchenService.updateTicketStatus(ticketId, restaurantId, body, user.sub);
  }
}
