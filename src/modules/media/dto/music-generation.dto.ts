import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { MediaGenerationDto } from './media-generation.dto';
import { MediaType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export enum MusicGenre {
  POP = 'POP',
  ROCK = 'ROCK',
  JAZZ = 'JAZZ',
  CLASSICAL = 'CLASSICAL',
  ELECTRONIC = 'ELECTRONIC',
  HIP_HOP = 'HIP_HOP',
  AMBIENT = 'AMBIENT',
}

export class MusicGenerationDto extends MediaGenerationDto {
  constructor() {
    super();
    this.mediaType = MediaType.MUSIC;
  }

  @ApiProperty({
    description: 'The duration of the music in seconds',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(8)
  durationSeconds?: number = 1;

  @ApiProperty({
    description: 'The genre of the music',
    example: 'POP',
  })
  @IsEnum(MusicGenre)
  @IsOptional()
  genre?: MusicGenre;

  @ApiProperty({
    description: 'The instrument of the music',
    example: 'Piano',
  })
  @IsString()
  @IsOptional()
  instrument?: string;

  @ApiProperty({
    description: 'The tempo of the music',
    example: 0.5,
  })
  @IsNumber()
  @IsOptional()
  @Min(0.1)
  @Max(1.0)
  tempo?: number = 0.5;

  @ApiProperty({
    description: 'The seed for the music generation',
    example: 123,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  seed?: number;
}
