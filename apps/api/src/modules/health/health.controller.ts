import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as os from 'os';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health() {
    let dbStatus = 'healthy';
    let latency = 0;
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      latency = Date.now() - start;
    } catch (err) {
      dbStatus = 'unhealthy';
    }

    const freeMem = os.freemem();
    const totalMem = os.totalmem();

    return {
      status: dbStatus === 'healthy' ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: latency,
      },
      system: {
        platform: os.platform(),
        uptimeSeconds: os.uptime(),
        memory: {
          freeGb: (freeMem / (1024 ** 3)).toFixed(2),
          totalGb: (totalMem / (1024 ** 3)).toFixed(2),
          utilizationPercent: (((totalMem - freeMem) / totalMem) * 100).toFixed(1),
        },
      },
    };
  }
}
