import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'new@test.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '12345', minLength: 5 })
  @IsString()
  @IsOptional()
  @MinLength(5)
  password?: string;

  @ApiPropertyOptional({ example: 'Nuevo Nombre' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.doctor })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
