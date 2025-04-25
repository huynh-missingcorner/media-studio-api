import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MediaType, RequestStatus } from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { ApiProperty } from '@nestjs/swagger';

export class MediaHistoryQueryDto extends PaginationDto {
  @ApiProperty({
    description: 'The type of media to filter by',
    example: 'IMAGE',
    required: false,
  })
  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;

  @ApiProperty({
    description: 'The status of the media to filter by',
    example: 'PENDING',
    required: false,
  })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiProperty({
    description: 'The search query to filter by',
    example: 'sunset',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string | null | undefined => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value as null | undefined;
  })
  search?: string;

  @ApiProperty({
    description: 'The ID of the project to filter by',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;
}
