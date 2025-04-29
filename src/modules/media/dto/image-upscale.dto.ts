import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MediaGenerationDto } from './media-generation.dto';
import { MediaType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { ImageGenerationModel, UpscaleFactor } from '../types/media.types';

export class ImageUpscaleDto extends MediaGenerationDto {
  constructor() {
    super();
    this.mediaType = MediaType.IMAGE;
  }

  @ApiProperty({
    description: 'The source image to upscale (GCS URI)',
    example: 'gs://bucket-name/source-photos/photo.png',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  gcsUri: string;

  @ApiProperty({
    description: 'The upscale factor for the image',
    enum: UpscaleFactor,
    default: UpscaleFactor.X2,
    required: false,
  })
  @IsEnum(UpscaleFactor)
  @IsOptional()
  upscaleFactor?: UpscaleFactor = UpscaleFactor.X2;

  @ApiProperty({
    description: 'The model to use for image upscaling',
    default: ImageGenerationModel.IMAGE_GENERATION_002,
    required: false,
  })
  @IsEnum(ImageGenerationModel)
  @IsOptional()
  model?: ImageGenerationModel = ImageGenerationModel.IMAGE_GENERATION_002;
}
