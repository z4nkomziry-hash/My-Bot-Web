import { Process, Processor } from '@nestjs/bull';
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
    this.logger.log(`Processing download job ${job.id}: ${job.data.url}`, 'DownloadProcessor');

    try {
      const result = await this.downloadService.processDownload(
        job.data.url,
        job.data.quality,
        job.data.userId,
      );

      this.logger.log(`Job ${job.id} completed successfully`, 'DownloadProcessor');
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.id} failed`, error.stack, 'DownloadProcessor');
      throw error;
    }
  }
}
