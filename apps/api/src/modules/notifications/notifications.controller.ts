import { Controller, Get, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get latest notifications for restaurant' })
  async findByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationsService.findByRestaurant(restaurantId, user.sub);
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @Param('restaurantId') restaurantId: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(notificationId, restaurantId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationsService.markAllAsRead(restaurantId, user.sub);
  }
}
