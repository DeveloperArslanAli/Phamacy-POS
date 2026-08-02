import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CheckoutService } from './checkout.service';
import { FinalizeCheckoutDto } from './dto/finalize-checkout.dto';

@Controller('checkout')
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @Permissions(Permission.POS)
  async finalize(@Body() body: FinalizeCheckoutDto) {
    return this.checkoutService.finalizeSale(body);
  }
}
