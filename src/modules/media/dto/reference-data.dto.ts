import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ReferenceType, SecondaryReferenceType } from '../types/reference.types';

export class ReferenceImageDto {
  @ApiProperty({
    description: 'The gcs uri for the reference image',
    example: 'gs://bucket/image.jpg',
  })
  @IsOptional()
  gcsUri?: string;

  @ApiProperty({
    description: 'The bytes base64 encoded for the reference image',
    example:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  })
  @IsOptional()
  bytesBase64Encoded?: string;
}

export class ReferenceDataDto {
  @ApiProperty({
    description: 'The reference id for the image generation',
    example: 1,
  })
  @IsNumber()
  referenceId: number;

  @ApiProperty({
    description: 'The description for the reference data',
    example: 'A beautiful landscape',
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The reference type for the image generation',
    example: ReferenceType.DEFAULT,
  })
  @IsEnum(ReferenceType)
  @IsOptional()
  referenceType?: ReferenceType = ReferenceType.DEFAULT;

  @ApiProperty({
    description: 'The secondary reference type for the image generation',
    example: SecondaryReferenceType.SUBJECT_TYPE_DEFAULT,
  })
  @IsEnum(SecondaryReferenceType)
  @IsOptional()
  secondaryReferenceType?: SecondaryReferenceType = SecondaryReferenceType.SUBJECT_TYPE_DEFAULT;

  @ApiProperty({
    description: 'The reference image for the image generation',
    type: ReferenceImageDto,
  })
  @IsNotEmpty()
  referenceImage: ReferenceImageDto;
}
