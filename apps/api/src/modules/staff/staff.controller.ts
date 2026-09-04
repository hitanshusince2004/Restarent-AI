import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Permission, SystemRole } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { inviteStaffSchema, updateStaffRoleSchema } from '@restaurant-os/validation';

@ApiTags('Staff')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/staff', version: '1' })
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequirePermissions(Permission.STAFF_READ)
  @ApiOperation({ summary: 'List all staff members and their roles' })
  async getStaffMembers(@Param('restaurantId') restaurantId: string) {
    return this.staffService.getStaffMembers(restaurantId);
  }

  @Post('invite')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Invite or add a team member to restaurant' })
  async inviteStaff(
    @Param('restaurantId') restaurantId: string,
    @Body(new ZodValidationPipe(inviteStaffSchema)) body: ReturnType<typeof inviteStaffSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.staffService.inviteStaff(restaurantId, body, user.sub);
  }

  @Patch(':membershipId/role')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Update staff member role' })
  async updateRole(
    @Param('restaurantId') restaurantId: string,
    @Param('membershipId') membershipId: string,
    @Body(new ZodValidationPipe(updateStaffRoleSchema)) body: ReturnType<typeof updateStaffRoleSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.staffService.updateRole(restaurantId, membershipId, body.role as SystemRole, user.sub);
  }

  @Delete(':membershipId')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Remove staff member from restaurant' })
  async removeStaff(
    @Param('restaurantId') restaurantId: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.staffService.removeStaff(restaurantId, membershipId, user.sub);
  }
}
