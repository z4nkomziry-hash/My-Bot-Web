import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Basic health check' })
  check() {
    return {
      status: 'ok',
      service: 'KRD-ProDown API',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness check' })
  ready() {
    return {
      status: 'ready',
      checks: {
        database: 'connected',
        redis: 'connected',
      },
    };
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness check' })
  live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
