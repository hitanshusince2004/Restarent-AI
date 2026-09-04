import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RbacService } from './rbac.service';
import { AuditService } from '../audit/audit.service';
import { InviteStaffDto, updateStaffRoleSchema } from '@restaurant-os/validation';
import { AuditAction, SystemRole, UserStatus } from '@restaurant-os/types';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
  ) {}

  async getStaffMembers(restaurantId: string) {
    const memberships = await this.prisma.restaurantUser.findMany({
      where: { restaurantId, isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, lastLoginAt: true } },
        role: { select: { id: true, name: true, systemRole: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      membershipId: m.id,
      user: m.user,
      role: m.role.systemRole ?? m.role.name,
      roleId: m.role.id,
      createdAt: m.createdAt,
    }));
  }

  async inviteStaff(restaurantId: string, dto: InviteStaffDto, actorId: string) {
    // 1. Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      // Create temporary account with random initial password
      const tempPassword = randomBytes(16).toString('hex');
      const passwordHash = await argon2.hash(tempPassword);

      user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          name: dto.name,
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });
    }

    // 2. Check if already member
    const existingMembership = await this.prisma.restaurantUser.findUnique({
      where: { restaurantId_userId: { restaurantId, userId: user.id } },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new ConflictException('User is already an active staff member of this restaurant');
      } else {
        // Reactivate
        await this.prisma.restaurantUser.update({
          where: { id: existingMembership.id },
          data: { isActive: true },
        });
      }
    }

    // 3. Find role
    const role = await this.prisma.role.findFirst({
      where: { restaurantId, systemRole: dto.role },
    });

    if (!role) throw new NotFoundException(`Role ${dto.role} not found`);

    // 4. Create membership
    const membership = await this.prisma.restaurantUser.create({
      data: {
        restaurantId,
        userId: user.id,
        roleId: role.id,
        invitedBy: actorId,
        acceptedAt: new Date(),
      },
    });

    await this.rbacService.invalidatePermissionCache(user.id, restaurantId);

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.STAFF_INVITED,
      resourceType: 'staff',
      resourceId: membership.id,
      metadata: { email: dto.email, role: dto.role },
    });

    return {
      message: 'Staff member added successfully',
      membershipId: membership.id,
    };
  }

  async updateRole(
    restaurantId: string,
    membershipId: string,
    newRole: SystemRole,
    actorId: string,
  ) {
    const membership = await this.prisma.restaurantUser.findFirst({
      where: { id: membershipId, restaurantId },
      include: { role: true },
    });

    if (!membership) throw new NotFoundException('Staff membership not found');

    const role = await this.prisma.role.findFirst({
      where: { restaurantId, systemRole: newRole },
    });

    if (!role) throw new NotFoundException(`Role ${newRole} not found`);

    await this.prisma.restaurantUser.update({
      where: { id: membershipId },
      data: { roleId: role.id },
    });

    await this.rbacService.invalidatePermissionCache(membership.userId, restaurantId);

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.STAFF_ROLE_CHANGED,
      resourceType: 'staff',
      resourceId: membershipId,
      metadata: { fromRole: membership.role.systemRole, toRole: newRole },
    });

    return { message: 'Staff role updated successfully' };
  }

  async removeStaff(restaurantId: string, membershipId: string, actorId: string) {
    const membership = await this.prisma.restaurantUser.findFirst({
      where: { id: membershipId, restaurantId },
      include: { role: true },
    });

    if (!membership) throw new NotFoundException('Staff membership not found');

    if (membership.role.systemRole === SystemRole.OWNER) {
      throw new BadRequestException('Cannot remove owner from restaurant');
    }

    await this.prisma.restaurantUser.update({
      where: { id: membershipId },
      data: { isActive: false },
    });

    await this.rbacService.invalidatePermissionCache(membership.userId, restaurantId);

    await this.auditService.log({
      actorId,
      restaurantId,
      action: AuditAction.STAFF_REMOVED,
      resourceType: 'staff',
      resourceId: membershipId,
    });

    return { message: 'Staff member removed' };
  }
}
