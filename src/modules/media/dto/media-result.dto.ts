import { MediaResult } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class MediaResultDto {
  @Expose()
  @ApiProperty({
    description: 'Media result ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Media result URL',
    example: 'https://example.com/media-result.jpg',
  })
  resultUrl: string;

  @Expose()
  @ApiProperty({
    description: 'Media result metadata',
    type: Object,
  })
  metadata?: Record<string, any>;

  @Expose()
  @ApiProperty({
    description: 'Media result created at',
    example: '2021-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  constructor(mediaResult: MediaResult) {
    Object.assign(this, {
      ...mediaResult,
      metadata: mediaResult.metadata as Record<string, any>,
    });
  }
}
