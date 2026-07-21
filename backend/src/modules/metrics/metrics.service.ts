import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class MetricsService {
  private readonly prefix = 'metrics:';

  constructor(private readonly redis: RedisService) {}

  async incrementDownload(platform?: string) {
    await this.redis.incr(`${this.prefix}downloads:total`);
    if (platform) {
      await this.redis.incr(`${this.prefix}downloads:${platform}`);
    }
  }

  async incrementUser() {
    await this.redis.incr(`${this.prefix}users:total`);
  }

  async getStats() {
    const totalDownloads = await this.redis.get(`${this.prefix}downloads:total`) || '0';
    const totalUsers = await this.redis.get(`${this.prefix}users:total`) || '0';
    
    return {
      downloads: parseInt(totalDownloads, 10),
      users: parseInt(totalUsers, 10),
    };
  }

  async recordApiCall(endpoint: string, responseTime: number) {
    await this.redis.lpush(`${this.prefix}api:calls`, JSON.stringify({
      endpoint,
      responseTime,
      timestamp: Date.now(),
    }));
  }
}
