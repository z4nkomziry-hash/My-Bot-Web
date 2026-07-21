import { Module } from '@nestjs/common';
import { DownloadController } from './download.controller';
import { DownloadService } from './download.service';
import { DownloadProcessor } from './download.processor';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'download',
    }),
  ],
  controllers: [DownloadController],
  providers: [DownloadService, DownloadProcessor],
  exports: [DownloadService],
})
export class DownloadModule {}
