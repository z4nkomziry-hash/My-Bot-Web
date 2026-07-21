import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from './logger.service';

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async log(data: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, any>;
    ip?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          details: data.details ? JSON.stringify(data.details) : null,
          ip: data.ip,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      this.logger.error('Failed to write audit log', error.stack, 'AuditService');
    }
  }
}
