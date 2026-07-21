import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../common/services/logger.service';
import { MetricsService } from '../metrics/metrics.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import axios from 'axios';

@Injectable()
export class DownloadService {
  private readonly tikwmApi: string;
  private readonly cobaltApi: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
    @InjectQueue('download') private readonly downloadQueue: Queue,
  ) {
    this.tikwmApi = configService.get('TIKWM_API', 'https://www.tikwm.com/api/');
    this.cobaltApi = configService.get('COBALT_API', 'https://api.cobalt.tools/api/json');
  }

  async processDownload(url: string, quality?: string, userId?: string) {
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new BadRequestException('لینکی نادروست');
    }

    // Detect platform
    const platform = this.detectPlatform(url);

    // Check cache
    const cacheKey = `download:${url}:${quality || 'default'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit: ${url}`, 'DownloadService');
      const result = JSON.parse(cached);
      await this.saveToHistory(url, platform, quality, userId);
      await this.metrics.incrementDownload(platform);
      return result;
    }

    // Process download
    let result: any;

    if (platform === 'TikTok') {
      result = await this.downloadTikTok(url);
    } else {
      result = await this.downloadUniversal(url, quality);
    }

    if (!result.success) {
      throw new BadRequestException('نەتوانرا ڤیدیۆ داونلۆد بکرێت');
    }

    // Cache result (1 hour)
    await this.redis.set(cacheKey, JSON.stringify(result), 3600);

    // Save history and update metrics
    await this.saveToHistory(url, platform, quality, userId);
    await this.metrics.incrementDownload(platform);

    return result;
  }

  async processBatch(urls: string[], userId?: string) {
    const results = [];

    for (const url of urls) {
      try {
        const result = await this.processDownload(url, '720p', userId);
        results.push({ url, success: true, ...result });
      } catch (error) {
        results.push({ url, success: false, error: error.message });
      }
    }

    return results;
  }

  async addToQueue(url: string, quality?: string, userId?: string) {
    const job = await this.downloadQueue.add('download', { url, quality, userId }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return {
      jobId: job.id,
      status: 'queued',
      message: 'داونلۆدەکەت خرایە ڕیز',
    };
  }

  async extractAudio(url: string) {
    const platform = this.detectPlatform(url);

    if (platform === 'TikTok') {
      const result = await this.downloadTikTok(url);
      if (result.audioUrl) {
        return { audioUrl: result.audioUrl, platform };
      }
    }

    const response = await axios.post(this.cobaltApi, {
      url,
      isAudioOnly: true,
      aFormat: 'mp3',
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    return {
      audioUrl: response.data.url,
      platform,
    };
  }

  async getThumbnail(url: string) {
    const platform = this.detectPlatform(url);

    if (platform === 'TikTok') {
      const result = await this.downloadTikTok(url);
      if (result.cover) {
        return { thumbnailUrl: result.cover, platform };
      }
    }

    return { thumbnailUrl: null, platform, message: 'وێنەی سەرەکی بەردەست نییە' };
  }

  private async downloadTikTok(url: string) {
    try {
      const response = await axios.get(`${this.tikwmApi}?url=${encodeURIComponent(url)}`);
      const data = response.data;

      if (data.code === 0 && data.data) {
        const video = data.data;
        return {
          success: true,
          platform: 'TikTok',
          videoUrl: video.hdplay || video.play,
          audioUrl: video.music || video.music_info?.url,
          cover: video.cover,
          title: video.title,
          author: video.author?.nickname,
          duration: video.duration,
          images: video.images || [],
          id: video.id,
        };
      }
    } catch (error) {
      this.logger.error(`TikTok download failed: ${url}`, error.stack, 'DownloadService');
    }

    return { success: false };
  }

  private async downloadUniversal(url: string, quality?: string) {
    try {
      const response = await axios.post(this.cobaltApi, {
        url,
        vQuality: quality?.replace('p', '') || '720',
        filenamePattern: 'basic',
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      const data = response.data;

      if (data.url || data.status === 'redirect' || data.status === 'stream') {
        return {
          success: true,
          platform: this.detectPlatform(url),
          videoUrl: data.url,
          audioUrl: data.url,
          id: Date.now().toString(),
        };
      }

      if (data.status === 'picker' && data.picker?.length) {
        return {
          success: true,
          platform: this.detectPlatform(url),
          images: data.picker.map((item: any) => item.url),
          id: Date.now().toString(),
        };
      }
    } catch (error) {
      this.logger.error(`Universal download failed: ${url}`, error.stack, 'DownloadService');
    }

    return { success: false };
  }

  private detectPlatform(url: string): string {
    const platforms: Record<string, string> = {
      'tiktok.com': 'TikTok',
      'vm.tiktok': 'TikTok',
      'instagram.com': 'Instagram',
      'youtube.com': 'YouTube',
      'youtu.be': 'YouTube',
      'facebook.com': 'Facebook',
      'fb.watch': 'Facebook',
      'snapchat.com': 'Snapchat',
      'pinterest.com': 'Pinterest',
      'pin.it': 'Pinterest',
    };

    for (const [domain, name] of Object.entries(platforms)) {
      if (url.includes(domain)) return name;
    }

    return 'Unknown';
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private async saveToHistory(
    url: string,
    platform: string,
    quality?: string,
    userId?: string,
  ) {
    await this.prisma.download.create({
      data: {
        url,
        platform,
        quality,
        userId: userId || null,
      },
    });

    if (userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          downloads: { increment: 1 },
          points: { increment: 10 },
        },
      });
    }

    await this.redis.incr('metrics:downloads:total');
  }
}
