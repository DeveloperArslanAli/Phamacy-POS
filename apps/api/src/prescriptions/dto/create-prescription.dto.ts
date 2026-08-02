import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested, IsInt, Min } from 'class-validator';

export class CreatePrescriptionLineDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  directions?: string;
}

export class CreatePrescriptionDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @IsOptional()
  @IsString()
  prescriberId?: string;

  @IsString()
  @IsNotEmpty()
  rxNo!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionLineDto)
  lines!: CreatePrescriptionLineDto[];
}
