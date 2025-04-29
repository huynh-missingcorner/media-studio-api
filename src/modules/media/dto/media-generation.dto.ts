import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { MediaType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class MediaGenerationDto {
  @ApiProperty({
    description: 'The ID of the project',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  projectId: string;

  @ApiProperty({
    description: 'The prompt for the media generation',
    example: 'A beautiful sunset over a calm ocean',
  })
  @IsNotEmpty()
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'The negative prompt for the media generation',
    example: 'low quality, blurry, distorted',
    default: '',
  })
  @IsString()
  @IsOptional()
  negativePrompt?: string;

  @ApiProperty({
    description: 'The type of media to generate',
    example: 'IMAGE',
  })
  @IsEnum(MediaType)
  mediaType: MediaType;
}
