import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpgradePlanDto {
  @ApiProperty({ example: 'premium', enum: ['plus', 'premium'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['plus', 'premium'])
  plan: string;
}
