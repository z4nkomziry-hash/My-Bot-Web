import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { DownloadService } from './download.service';
import { LoggerService } from '../../common/services/logger.service';

@Processor('download')
export class DownloadProcessor {
  constructor(
    private readonly downloadService: DownloadService,
    private readonly logger: LoggerService,
  ) {}

  @Process('download')
  async handleDownload(job: Job<{ url: string; quality?: string; userId?: string }>) {
    const { url, quality, userId } = job.data;
    
    this.logger.log(
      `Processing job ${job.id}: ${url.substring(0, 50)}...`,
      'DownloadProcessor',
    );

    await job.progress(10);

    const result = await this.downloadService.processDownload(url, quality, userId);

    await job.progress(100);

    return result;
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Job ${job.id} started`, 'DownloadProcessor');
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed`, 'DownloadProcessor');
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts`,
      error.stack,
      'DownloadProcessor',
    );
  }
}
