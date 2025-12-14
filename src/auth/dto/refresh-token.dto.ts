import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Refresh token (si tu guard lo valida por Authorization header, este campo puede ser solo “dummy” para Swagger)',
  })
  @IsString()
  refreshToken: string;
}
