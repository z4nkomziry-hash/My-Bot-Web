import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DownloadController } from './download.controller';
import { DownloadService } from './download.service';
import { DownloadProcessor } from './download.processor';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'download',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    MetricsModule,
  ],
  controllers: [DownloadController],
  providers: [DownloadService, DownloadProcessor],
  exports: [DownloadService],
})
export class DownloadModule {}
