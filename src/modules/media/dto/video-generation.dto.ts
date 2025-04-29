import { IsBoolean, IsEnum, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { MediaGenerationDto } from './media-generation.dto';
import { MediaType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { VideoAspectRatio, VideoGenerationModel } from '../types/media.types';
import { Type } from 'class-transformer';
import { ReferenceImageDto } from './reference-data.dto';

export class VideoGenerationDto extends MediaGenerationDto {
  constructor() {
    super();
    this.mediaType = MediaType.VIDEO;
  }

  @ApiProperty({
    description: 'The duration of the video in seconds',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(8)
  durationSeconds?: number = 1;

  @ApiProperty({
    description: 'The aspect ratio of the image',
    example: VideoAspectRatio.SIXTEEN_TO_NINE,
  })
  @IsEnum(VideoAspectRatio)
  @IsOptional()
  aspectRatio?: VideoAspectRatio;

  @ApiProperty({
    description: 'Whether to enhance the prompt',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  enhancePrompt?: boolean = true;

  @ApiProperty({
    description: 'The number of samples to generate',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(4)
  sampleCount?: number = 1;

  @ApiProperty({
    description: 'The model to use for the image generation',
    default: VideoGenerationModel.VEO_2,
  })
  @IsEnum(VideoGenerationModel)
  @IsOptional()
  model?: VideoGenerationModel = VideoGenerationModel.VEO_2;

  @ApiProperty({
    description: 'The seed for the video generation',
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  seed?: number;

  @ApiProperty({
    description: 'The reference image for video generation',
    type: ReferenceImageDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReferenceImageDto)
  referenceImage?: ReferenceImageDto;
}
