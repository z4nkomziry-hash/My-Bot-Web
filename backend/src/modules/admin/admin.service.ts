import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../common/services/logger.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async getDashboard() {
    const [totalUsers, totalDownloads, subscriptions, recentUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.download.count(),
      this.prisma.subscription.groupBy({
        by: ['plan'],
        _count: true,
      }),
      this.prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          level: true,
          downloads: true,
          createdAt: true,
        },
      }),
    ]);

    const totalRevenue = 0;

    return {
      totalUsers,
      totalDownloads,
      subscriptions: subscriptions.map((s) => ({
        plan: s.plan,
        count: s._count,
      })),
      totalRevenue,
      recentUsers,
    };
  }

  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          level: true,
          downloads: true,
          points: true,
          emailVerified: true,
          createdAt: true,
          subscription: {
            select: { plan: true, status: true },
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAnalytics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [downloadsToday, downloadsTotal, usersToday, popularPlatforms] = await Promise.all([
      this.prisma.download.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.download.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.download.groupBy({
        by: ['platform'],
        _count: true,
        orderBy: { _count: 'desc' },
        take: 10,
      }),
    ]);

    return {
      downloadsToday,
      downloadsTotal,
      usersToday,
      popularPlatforms: popularPlatforms.map((p) => ({
        platform: p.platform,
        count: p._count,
      })),
    };
  }
}
