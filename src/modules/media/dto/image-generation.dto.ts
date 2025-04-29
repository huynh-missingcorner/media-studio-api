import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { MediaGenerationDto } from './media-generation.dto';
import { MediaType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { ImageAspectRatio, ImageGenerationModel } from '../types/media.types';
import { ReferenceDataDto } from './reference-data.dto';

export class ImageGenerationDto extends MediaGenerationDto {
  constructor() {
    super();
    this.mediaType = MediaType.IMAGE;
  }

  @ApiProperty({
    description: 'The aspect ratio of the image',
    example: ImageAspectRatio.ONE_TO_ONE,
    required: false,
  })
  @IsEnum(ImageAspectRatio)
  @IsOptional()
  aspectRatio?: ImageAspectRatio;

  @ApiProperty({
    description: 'The number of samples to generate',
    example: 1,
    default: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(4)
  sampleCount?: number = 1;

  @ApiProperty({
    description: 'The model to use for the image generation',
    default: ImageGenerationModel.IMAGEN_3,
    required: false,
  })
  @IsEnum(ImageGenerationModel)
  @IsOptional()
  model?: ImageGenerationModel = ImageGenerationModel.IMAGEN_3;

  @ApiProperty({
    description: 'The reference data for the image generation',
    type: [ReferenceDataDto],
    required: false,
  })
  @IsOptional()
  referenceData?: ReferenceDataDto[];
}
