import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'newuser@test.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Usuario Prueba' })
  @IsString()
  name: string;

  // Solo doctor | patient
  @ApiProperty({
    enum: [Role.doctor, Role.patient],
    example: Role.patient,
  })
  @IsIn([Role.doctor, Role.patient])
  role: Role;

  // Para médicos
  @ApiPropertyOptional({ example: 'Medicina general' })
  @ValidateIf((o) => o.role === Role.doctor)
  @IsString()
  specialty?: string;

  // Para pacientes
  @ApiPropertyOptional({ example: '1995-03-22' })
  @ValidateIf((o) => o.role === Role.patient)
  @IsDateString()
  birthDate?: string;
}
