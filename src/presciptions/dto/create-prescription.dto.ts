import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PrescriptionItemDto {
  @ApiProperty({
    example: 'Ibuprofeno',
    description: 'Nombre del medicamento',
  })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del medicamento es requerido' })
  name: string;

  @ApiPropertyOptional({
    example: '400mg',
    description: 'Dosis (opcional)',
  })
  @IsString({ message: 'La dosis debe ser texto' })
  @IsOptional()
  dosage?: string;

  @ApiPropertyOptional({
    example: 12,
    description: 'Cantidad (entero, mínimo 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity?: number;

  @ApiPropertyOptional({
    example: '1 cada 8 horas',
    description: 'Instrucciones (opcional)',
  })
  @IsString({ message: 'Las instrucciones deben ser texto' })
  @IsOptional()
  instructions?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({
    example: 'ck_patient_id',
    description: 'ID del paciente (Patient.id)',
  })
  @IsString({ message: 'patientId debe ser texto' })
  @IsNotEmpty({ message: 'El ID del paciente es requerido' })
  patientId: string;

  @ApiPropertyOptional({
    example: 'Dolor muscular - control en 1 semana',
    description: 'Notas/diagnóstico (opcional)',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;

  @ApiProperty({
    type: [PrescriptionItemDto],
    description: 'Lista de medicamentos (mínimo 1)',
    example: [
      {
        name: 'Ibuprofeno',
        dosage: '400mg',
        quantity: 12,
        instructions: '1 cada 8 horas',
      },
    ],
  })
  @IsArray({ message: 'items debe ser un arreglo' })
  @ArrayNotEmpty({ message: 'Debes enviar al menos un medicamento en items' })
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}
