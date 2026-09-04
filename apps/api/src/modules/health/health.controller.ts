import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Public } from '../../common/decorators/auth.decorators';

@ApiTags('Health')
@Controller({ version: '1' })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Basic liveness check — always returns 200 if app is running' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'restaurant-os-api',
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness check — verifies all critical dependencies' })
  async readiness() {
    const [dbHealthy, redisHealthy] = await Promise.all([
      this.prisma.isHealthy(),
      this.redis.isHealthy(),
    ]);

    const allHealthy = dbHealthy && redisHealthy;

    return {
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy ? 'ok' : 'error',
        redis: redisHealthy ? 'ok' : 'error',
      },
    };
  }
}
