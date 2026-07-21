import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../common/services/logger.service';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
    private readonly audit: AuditService,
  ) {}

  async getSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('هیچ ئەشتراکێک نەدۆزرایەوە');
    }

    return subscription;
  }

  async upgradePlan(userId: string, plan: string) {
    const validPlans = ['free', 'plus', 'premium'];
    if (!validPlans.includes(plan)) {
      throw new BadRequestException('پلانی نادروست');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new NotFoundException('بەکارهێنەر نەدۆزرایەوە');
    }

    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        plan,
        status: 'active',
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      create: {
        userId,
        plan,
        status: 'active',
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await this.audit.log({
      userId,
      action: 'upgrade_plan',
      resource: 'subscription',
      resourceId: subscription.id,
      details: { plan },
    });

    this.logger.log(`User ${userId} upgraded to ${plan}`, 'SubscriptionService');

    return subscription;
  }

  async startTrial(userId: string, plan: string) {
    if (plan !== 'plus' && plan !== 'premium') {
      throw new BadRequestException('تاقیکردنەوە تەنها بۆ Plus و Premium بەردەستە');
    }

    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (existingSubscription?.trialEndsAt) {
      throw new BadRequestException('ئێوە پێشتر تاقیکردنەوەتان بەکارهێناوە');
    }

    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        plan,
        status: 'trialing',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      create: {
        userId,
        plan,
        status: 'trialing',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return subscription;
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    await this.audit.log({
      userId,
      action: 'cancel_subscription',
      resource: 'subscription',
    });

    return subscription;
  }

  getFeatures(plan: string): string[] {
    const features = {
      free: ['HD Video Download', 'Audio Download', 'Thumbnail Download', 'Preview Before Download'],
      plus: [
        'All Free Features',
        'Faster Download Speed',
        'No Ads',
        'Download Queue',
        'Unlimited History',
        'Favorites & Collections',
        'Premium Themes',
      ],
      premium: [
        'All Plus Features',
        'Batch Download',
        'Playlist Download',
        'Cloud Sync',
        'AI Caption Generator',
        'AI Hashtag Generator',
        'AI Video Summary',
        'Premium Badge',
        'Priority Support',
        'API Access',
      ],
    };

    return features[plan] || features.free;
  }

  canAccessFeature(userId: string, feature: string): boolean {
    // Implement feature flag checking based on subscription
    return true;
  }
}
