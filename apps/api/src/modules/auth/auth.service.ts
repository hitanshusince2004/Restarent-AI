import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { NotificationProviderService } from '../../providers/notification/notification-provider.service';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import {
  RegisterDto,
  LoginDto,
} from '@restaurant-os/validation';
import { JwtPayload } from './types/jwt-payload.type';
import { AuditAction, UserStatus } from '@restaurant-os/types';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly notificationProvider: NotificationProviderService,
  ) {}

  // ─────────────────────────────────────────────
  // Registration
  // ─────────────────────────────────────────────

  async register(dto: RegisterDto, ipAddress?: string): Promise<{ message: string }> {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      // Do not reveal whether email exists (prevents user enumeration)
      // But we still raise an error because registration is explicitly providing email
      throw new ConflictException('An account with this email address already exists.');
    }

    // Hash password with Argon2id (most secure variant)
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,  // 64 MB
      timeCost: 3,
      parallelism: 4,
    });

    // Generate email verification token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          name: dto.name,
          phone: dto.phone || null,
          passwordHash,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: newUser.id,
          tokenHash,
          expiresAt,
        },
      });

      return newUser;
    });

    // Send verification email (non-blocking)
    this.notificationProvider
      .sendEmailVerification(user.email, user.name, rawToken)
      .catch((err) =>
        this.logger.error({ msg: 'Failed to send verification email', userId: user.id, err }),
      );

    await this.auditService.log({
      actorId: user.id,
      action: AuditAction.USER_REGISTERED,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
      metadata: { email: user.email },
    });

    this.logger.log({ msg: 'User registered', userId: user.id });

    return {
      message:
        'Account created successfully. Please check your email to verify your account.',
    };
  }

  // ─────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string; status: string };
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Use consistent timing to prevent user enumeration
    const dummyHash =
      '$argon2id$v=19$m=65536,t=3,p=4$dummydummydummydummydummydu$dummydummydummydummydummydummydummydummydummydum';

    if (!user) {
      // Still hash to prevent timing attacks
      await argon2.verify(dummyHash, dto.password).catch(() => {});
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Account temporarily locked due to too many failed login attempts. Try again after ${user.lockedUntil.toISOString()}.`,
      );
    }

    // Verify password
    const passwordValid = await argon2.verify(user.passwordHash, dto.password).catch(() => false);

    if (!passwordValid) {
      // Increment failed attempts
      const newAttempts = user.failedLoginAttempts + 1;
      const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
            : undefined,
        },
      });

      if (shouldLock) {
        this.logger.warn({ msg: 'Account locked due to failed attempts', userId: user.id });
      }

      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    // Reset failed attempts + update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        // Auto-activate pending accounts on first login if desired (optional)
        // status: user.status === UserStatus.PENDING_VERIFICATION ? UserStatus.ACTIVE : user.status,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, ipAddress, userAgent);

    await this.auditService.log({
      actorId: user.id,
      action: AuditAction.USER_LOGIN,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
      metadata: { email: user.email },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
      },
    };
  }

  // ─────────────────────────────────────────────
  // Token refresh
  // ─────────────────────────────────────────────

  async refresh(
    rawRefreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify JWT structure
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(rawRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type.');
    }

    // Validate against stored token (token rotation)
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, status: true } } },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      // If already revoked, revoke all tokens for this user (potential replay attack)
      if (storedToken?.revokedAt) {
        this.logger.warn({
          msg: 'Refresh token reuse detected — possible token theft',
          userId: payload.sub,
        });
        await this.revokeAllUserTokens(payload.sub);
      }
      throw new UnauthorizedException('Refresh token is invalid, expired, or already used.');
    }

    if (storedToken.user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account has been suspended.');
    }

    // Revoke old token (token rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(storedToken.user.id, storedToken.user.email, ipAddress, userAgent);
  }

  // ─────────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────────

  async logout(rawRefreshToken: string, userId: string, ipAddress?: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.USER_LOGOUT,
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
    });
  }

  // ─────────────────────────────────────────────
  // Email verification
  // ─────────────────────────────────────────────

  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, status: true } } },
    });

    if (
      !verificationToken ||
      verificationToken.usedAt ||
      verificationToken.expiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Email verification link is invalid or has expired. Please request a new one.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerifiedAt: new Date(),
          status: UserStatus.ACTIVE,
        },
      }),
    ]);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  // ─────────────────────────────────────────────
  // Password reset
  // ─────────────────────────────────────────────

  async forgotPassword(email: string, ipAddress?: string): Promise<{ message: string }> {
    // Always return success to prevent user enumeration
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, email: true, status: true },
    });

    if (user && user.status !== UserStatus.SUSPENDED) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      this.notificationProvider
        .sendPasswordReset(user.email, user.name, rawToken)
        .catch((err) =>
          this.logger.error({ msg: 'Failed to send password reset email', userId: user.id, err }),
        );

      await this.auditService.log({
        actorId: user.id,
        action: AuditAction.PASSWORD_RESET,
        resourceType: 'user',
        resourceId: user.id,
        ipAddress,
      });
    }

    return {
      message: 'If an account exists with that email, a password reset link has been sent.',
    };
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset link is invalid or has expired. Please request a new one.');
    }

    const newHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash: newHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      // Revoke all active refresh tokens (force re-login everywhere)
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.auditService.log({
      actorId: resetToken.userId,
      action: AuditAction.PASSWORD_CHANGED,
      resourceType: 'user',
      resourceId: resetToken.userId,
      ipAddress,
    });

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private async generateTokens(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: JwtPayload = { sub: userId, email, type: 'access' };
    const refreshPayload: JwtPayload = { sub: userId, email, type: 'refresh' };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Store hashed refresh token
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: userAgent?.substring(0, 500) || null,
        ipAddress: ipAddress || null,
      },
    });

    return { accessToken, refreshToken };
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
