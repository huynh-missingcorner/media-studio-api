import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { MediaGenerationDto } from './media-generation.dto';
import { MediaType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { ImageAspectRatio, ImageGenerationModel } from '../types/media.types';

export class ImageGenerationDto extends MediaGenerationDto {
  constructor() {
    super();
    this.mediaType = MediaType.IMAGE;
  }

  @ApiProperty({
    description: 'The aspect ratio of the image',
    example: ImageAspectRatio.ONE_TO_ONE,
  })
  @IsEnum(ImageAspectRatio)
  @IsOptional()
  aspectRatio?: ImageAspectRatio;

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
    default: ImageGenerationModel.IMAGEN_3,
  })
  @IsEnum(ImageGenerationModel)
  @IsOptional()
  model?: ImageGenerationModel = ImageGenerationModel.IMAGEN_3;
}
