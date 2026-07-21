import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || value.length < 10) {
      throw new BadRequestException('Invalid ID format');
    }
    return value;
  }
}
