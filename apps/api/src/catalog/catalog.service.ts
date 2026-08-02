import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async searchItems(query: string, tenantId?: string, type?: string) {
    const filter = query?.trim();
    const where: any = {
      AND: [
        tenantId ? { tenantId } : undefined,
        type ? { type } : undefined,
        filter
          ? {
              OR: [
                { name: { contains: filter, mode: 'insensitive' } },
                { sku: { contains: filter, mode: 'insensitive' } },
                { variants: { some: { barcode: { contains: filter, mode: 'insensitive' } } } },
              ],
            }
          : undefined,
      ].filter(Boolean),
    };

    return this.prisma.item.findMany({
      where,
      include: {
        variants: true,
        inventoryBalances: {
          include: {
            batchLot: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
