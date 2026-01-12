import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT Authentication Guard
 * Extends Passport's AuthGuard to protect routes with JWT authentication
 * Usage: @UseGuards(JwtAuthGuard) on controllers or routes
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Add custom authentication logic here if needed
    return super.canActivate(context);
  }
}
