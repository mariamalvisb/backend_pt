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

export class PrescriptionItemDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del medicamento es requerido' })
  name: string;

  @IsString({ message: 'La dosis debe ser texto' })
  @IsOptional()
  dosage?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity?: number;

  @IsString({ message: 'Las instrucciones deben ser texto' })
  @IsOptional()
  instructions?: string;
}

export class CreatePrescriptionDto {
  @IsString({ message: 'patientId debe ser texto' })
  @IsNotEmpty({ message: 'El ID del paciente es requerido' })
  patientId: string;

  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;

  @IsArray({ message: 'items debe ser un arreglo' })
  @ArrayNotEmpty({ message: 'Debes enviar al menos un medicamento en items' })
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}
