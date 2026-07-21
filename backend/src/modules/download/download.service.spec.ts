import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DownloadService } from './download.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../common/services/logger.service';
import { MetricsService } from '../metrics/metrics.service';
import { getQueueToken } from '@nestjs/bull';

describe('DownloadService', () => {
  let service: DownloadService;

  const mockPrisma = {
    download: { create: jest.fn() },
    user: { update: jest.fn() },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadService,
        ConfigService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: LoggerService, useValue: { log: jest.fn(), error: jest.fn() } },
        { provide: MetricsService, useValue: { incrementDownload: jest.fn() } },
        { provide: getQueueToken('download'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<DownloadService>(DownloadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should validate URLs correctly', () => {
    expect(() => service.processDownload('invalid-url')).rejects.toThrow();
  });

  it('should detect TikTok platform', () => {
    const result = (service as any).detectPlatform('https://www.tiktok.com/@user/video/123');
    expect(result).toBe('TikTok');
  });

  it('should detect Instagram platform', () => {
    const result = (service as any).detectPlatform('https://www.instagram.com/reel/abc/');
    expect(result).toBe('Instagram');
  });
});
