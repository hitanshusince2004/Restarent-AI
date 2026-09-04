import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { JwtPayload } from '../types/jwt-payload.type';
import { UserStatus } from '@restaurant-os/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Re-validate user exists and is active on every request.
    // This adds a DB query but is required for:
    // - Account suspension to take effect immediately
    // - Detect deleted accounts
    // Using a short cache (e.g., 30s) would be acceptable in production.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true, lockedUntil: true },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account has been suspended');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        `Account temporarily locked due to failed login attempts. Try again after ${user.lockedUntil.toISOString()}`,
      );
    }

    return payload;
  }
}
