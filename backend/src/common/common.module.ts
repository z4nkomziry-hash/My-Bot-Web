import { Global, Module } from '@nestjs/common';
import { LoggerService } from './services/logger.service';
import { AuditService } from './services/audit.service';

@Global()
@Module({
  providers: [LoggerService, AuditService],
  exports: [LoggerService, AuditService],
})
export class CommonModule {}
