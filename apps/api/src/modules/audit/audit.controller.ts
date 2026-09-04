import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { Permission } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { paginationSchema } from '@restaurant-os/validation';

@ApiTags('Audit')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/audit', version: '1' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: 'Get audit logs for a restaurant' })
  async getAuditLogs(
    @Param('restaurantId') restaurantId: string,
    @Query(new ZodValidationPipe(paginationSchema)) query: { page: number; limit: number },
  ) {
    return this.auditService.findByRestaurant(restaurantId, query);
  }
}
