import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionService } from './subscription.service';
import { UpgradePlanDto } from './dto/subscription.dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({ summary: 'Get current subscription' })
  async getSubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionService.getSubscription(userId);
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan upgraded' })
  @ApiResponse({ status: 400, description: 'Invalid plan' })
  async upgradePlan(
    @CurrentUser('id') userId: string,
    @Body() dto: UpgradePlanDto,
  ) {
    return this.subscriptionService.upgradePlan(userId, dto.plan);
  }

  @Post('trial')
  @ApiOperation({ summary: 'Start 7-day free trial' })
  async startTrial(
    @CurrentUser('id') userId: string,
    @Body() dto: UpgradePlanDto,
  ) {
    return this.subscriptionService.startTrial(userId, dto.plan);
  }

  @Delete('cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionService.cancelSubscription(userId);
  }

  @Get('features')
  @ApiOperation({ summary: 'Get available features for current plan' })
  async getFeatures(@CurrentUser('id') userId: string) {
    const subscription = await this.subscriptionService.getSubscription(userId);
    return this.subscriptionService.getFeatures(subscription.plan);
  }
}
