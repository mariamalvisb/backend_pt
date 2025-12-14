import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'patient@test.com',
    description: 'Email del usuario',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'patient123',
    minLength: 5,
    description: 'Contraseña del usuario',
  })
  @IsString()
  @MinLength(5)
  password: string;
}
