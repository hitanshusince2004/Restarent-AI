import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
      },
    });
  }
}
