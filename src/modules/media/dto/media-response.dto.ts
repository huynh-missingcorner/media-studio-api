import { MediaGeneration, MediaResult, MediaType, RequestStatus } from '@prisma/client';
import { Exclude, Expose, Type } from 'class-transformer';
import { MediaResultDto } from './media-result.dto';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class MediaResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Media generation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Media type',
    example: 'IMAGE',
  })
  mediaType: MediaType;

  @Expose()
  @ApiProperty({
    description: 'Prompt',
    example: 'A beautiful sunset over a calm ocean',
  })
  prompt: string;

  @Expose()
  status: RequestStatus;

  @Expose()
  @ApiProperty({
    description: 'Media results',
    type: [MediaResultDto],
  })
  @Type(() => MediaResultDto)
  results: MediaResultDto[];

  @Expose()
  @ApiProperty({
    description: 'Error message',
    example: 'An error occurred while generating the media',
  })
  errorMessage?: string;

  @Expose()
  @ApiProperty({
    description: 'Parameters',
    type: Object,
  })
  parameters: Record<string, any>;

  @Expose()
  @ApiProperty({
    description: 'Created at',
    example: '2021-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  projectId: string;

  constructor(mediaGeneration: MediaGeneration & { results?: MediaResult[] }) {
    Object.assign(this, {
      ...mediaGeneration,
      parameters: mediaGeneration.parameters as Record<string, any>,
      results: Array.isArray(mediaGeneration.results)
        ? mediaGeneration.results.map((result) => new MediaResultDto(result))
        : [],
    });
  }
}
