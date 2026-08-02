import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantContext } from '../common/tenant-context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if the user is authenticated (JwtAuthGuard runs before this)
    if (!user) {
      return next.handle();
    }

    let activeTenantId = user.tenantId;

    // Super Admin can override or supervise other tenants if requested
    if (user.role === 'admin') {
      const queryTenantId = request.query?.tenantId;
      const bodyTenantId = request.body?.tenantId;
      
      if (queryTenantId) {
        activeTenantId = queryTenantId;
      } else if (bodyTenantId) {
        activeTenantId = bodyTenantId;
      }
    } else {
      // Normal pharmacy users can never switch tenants.
      // We strictly validate query parameter or body tenantId if they tried to send one
      const queryTenantId = request.query?.tenantId;
      const bodyTenantId = request.body?.tenantId;

      if (queryTenantId && queryTenantId !== activeTenantId) {
        throw new ForbiddenException('Access Denied: You cannot manipulate or switch query tenant context.');
      }
      if (bodyTenantId && bodyTenantId !== activeTenantId) {
        throw new ForbiddenException('Access Denied: You cannot manipulate or switch request body tenant context.');
      }
    }

    const payload = {
      tenantId: activeTenantId,
      isAdmin: user.role === 'admin'
    };

    // Bind request context to AsyncLocalStorage tenantContext store
    return new Observable((subscriber) => {
      tenantContext.run(payload, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
