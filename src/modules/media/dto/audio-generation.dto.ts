import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { MediaGenerationDto } from './media-generation.dto';
import { MediaType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
export class AudioGenerationDto extends MediaGenerationDto {
  constructor() {
    super();
    this.mediaType = MediaType.AUDIO;
  }

  @ApiProperty({
    description: 'The duration of the audio in seconds',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(300)
  durationSeconds?: number = 1;

  @ApiProperty({
    description: 'The style of the audio',
    example: 'Jazz',
  })
  @IsString()
  @IsOptional()
  audioStyle?: string;

  @ApiProperty({
    description: 'The seed for the audio generation',
    example: 123,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  seed?: number;
}
