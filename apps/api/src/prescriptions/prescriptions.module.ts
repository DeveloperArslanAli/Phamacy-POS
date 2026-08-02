import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PrismaService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
