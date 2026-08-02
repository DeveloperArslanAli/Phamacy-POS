import { Module } from '@nestjs/common';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [RefundController],
  providers: [RefundService, PrismaService],
  exports: [RefundService],
})
export class RefundModule {}
