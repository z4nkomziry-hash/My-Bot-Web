import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayMinSize } from 'class-validator';

export class DownloadDto {
  @ApiProperty({ example: 'https://www.tiktok.com/@user/video/123456789' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ example: '1080p', enum: ['720p', '1080p', '4K'] })
  @IsOptional()
  @IsString()
  quality?: string;
}

export class BatchDownloadDto {
  @ApiProperty({ example: ['https://www.tiktok.com/@user/video/123', 'https://www.instagram.com/reel/456'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  urls: string[];
}
