import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsDateString,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  // Sólo usaremos doctor | patient aquí; admin se creará por seed
  @IsEnum(Role)
  role: Role;

  // Para médicos
  @IsOptional()
  @IsString()
  specialty?: string;

  // Para pacientes
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
