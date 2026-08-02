import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * TenantGuard enforces server-side tenant isolation.
 *
 * For every request:
 * 1. Reads the authenticated user's tenantId from req.user (set by JwtStrategy)
 * 2. Reads the client-supplied tenantId from query params OR request body
 * 3. If the user is NOT an admin:
 *    - If client sent a tenantId that doesn't match → 403 Forbidden
 *    - If client didn't send a tenantId → auto-inject req.user.tenantId
 * 4. Admin users can access any tenant (supervisory role)
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no authenticated user, let other guards handle it
    if (!user || !user.tenantId) {
      return true;
    }

    const userTenantId = user.tenantId;

    // Admin users can access any tenant (supervisory role)
    if (user.role === 'admin') {
      return true;
    }

    // Check query params
    if (request.query && request.query.tenantId) {
      if (request.query.tenantId !== userTenantId) {
        throw new ForbiddenException(
          'Access denied: You do not have permission to access another pharmacy\'s data.',
        );
      }
    } else if (request.query) {
      // Auto-inject tenantId into query params if not provided
      request.query.tenantId = userTenantId;
    }

    // Check request body
    if (request.body && typeof request.body === 'object') {
      if (request.body.tenantId) {
        if (request.body.tenantId !== userTenantId) {
          throw new ForbiddenException(
            'Access denied: You cannot create or modify data in another pharmacy\'s system.',
          );
        }
      } else {
        // Auto-inject tenantId into body if not provided
        request.body.tenantId = userTenantId;
      }
    }

    return true;
  }
}
