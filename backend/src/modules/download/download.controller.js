import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DownloadService } from './download.service';
import { DownloadDto, BatchDownloadDto } from './dto/download.dto';

@ApiTags('Download')
@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Post()
  @Public()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Download video from URL' })
  @ApiResponse({ status: 200, description: 'Download successful' })
  @ApiResponse({ status: 400, description: 'Invalid URL or download failed' })
  async download(
    @Body() dto: DownloadDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.downloadService.processDownload(dto.url, dto.quality, userId);
  }

  @Post('batch')
  @Public()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Batch download multiple videos' })
  async batchDownload(
    @Body() dto: BatchDownloadDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.downloadService.processBatch(dto.urls, userId);
  }

  @Post('queue')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add download to queue (Premium users)' })
  async queueDownload(
    @Body() dto: DownloadDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.downloadService.addToQueue(dto.url, dto.quality, userId);
  }

  @Post('audio')
  @Public()
  @ApiOperation({ summary: 'Extract audio from video' })
  async extractAudio(@Body() dto: DownloadDto) {
    return this.downloadService.extractAudio(dto.url);
  }

  @Post('thumbnail')
  @Public()
  @ApiOperation({ summary: 'Get video thumbnail' })
  async getThumbnail(@Body() dto: DownloadDto) {
    return this.downloadService.getThumbnail(dto.url);
  }
}
