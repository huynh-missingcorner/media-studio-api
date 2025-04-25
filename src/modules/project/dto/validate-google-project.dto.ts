import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateGoogleProjectDto {
  @ApiProperty({
    description: 'Google Cloud Project ID to validate',
    example: 'my-gcp-project-123',
  })
  @IsString()
  @IsNotEmpty()
  googleProjectId: string;
}

export class ValidateGoogleProjectResponseDto {
  @ApiProperty({
    description: 'Whether the Google Project ID is valid',
    example: true,
  })
  valid: boolean;
}
