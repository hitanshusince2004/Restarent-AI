import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators';
import { Observable } from 'rxjs';

/**
 * JWT authentication guard with @Public() support.
 * Wraps Passport's JWT strategy.
 * All routes are protected by default — use @Public() to opt out.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context) as boolean | Promise<boolean> | Observable<boolean>;
  }

  handleRequest<TUser>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token. Please log in again.');
    }
    return user;
  }
}
