import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/auth.decorators';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { JwtPayload } from './types/jwt-payload.type';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@restaurant-os/validation';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 registrations per minute per IP
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: ReturnType<typeof registerSchema.parse>,
    @Req() req: Request,
  ) {
    return this.authService.register(body, req.ip || undefined);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 attempts per minute per IP
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful — returns access + refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account suspended or locked' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: ReturnType<typeof loginSchema.parse>,
    @Req() req: Request,
  ) {
    return this.authService.login(body, req.ip || undefined, req.headers['user-agent']);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New token pair issued' })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired' })
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: { refreshToken: string },
    @Req() req: Request,
  ) {
    return this.authService.refresh(body.refreshToken, req.ip || undefined, req.headers['user-agent']);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: { refreshToken: string },
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.authService.logout(body.refreshToken, user.sub, req.ip || undefined);
    return { message: 'Logged out successfully.' };
  }

  @Get('verify-email')
  @Public()
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } }) // 3 requests per minute per IP
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent (if account exists)' })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: { email: string },
    @Req() req: Request,
  ) {
    return this.authService.forgotPassword(body.email, req.ip || undefined);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Reset password with token from email' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: { token: string; password: string; confirmPassword: string },
  ) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current authenticated user info' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async me(@CurrentUser() user: JwtPayload) {
    return { userId: user.sub, email: user.email };
  }
}
