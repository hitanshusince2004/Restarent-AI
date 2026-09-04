import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { Permission } from '@restaurant-os/types';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @RequirePermissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get daily sales, orders, and KPI overview' })
  async getDailyOverview(
    @Param('restaurantId') restaurantId: string,
    @Query('date') date?: string,
  ) {
    return this.reportsService.getDailyOverview(restaurantId, date);
  }

  @Get('top-items')
  @RequirePermissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get top performing menu items by sales count' })
  async getTopItems(
    @Param('restaurantId') restaurantId: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getTopItems(
      restaurantId,
      days ? parseInt(days, 10) : 7,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('hourly')
  @RequirePermissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get hourly order and sales distribution' })
  async getHourlyOrders(
    @Param('restaurantId') restaurantId: string,
    @Query('date') date?: string,
  ) {
    return this.reportsService.getHourlyOrders(restaurantId, date);
  }

  @Get('active-tables')
  @RequirePermissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get active tables summary for operations dashboard' })
  async getActiveTables(@Param('restaurantId') restaurantId: string) {
    return this.reportsService.getActiveTables(restaurantId);
  }
}
