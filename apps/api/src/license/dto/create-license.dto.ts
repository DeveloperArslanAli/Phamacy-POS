import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLicenseDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @Type(() => Date)
  @IsDate()
  expiresAt!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  offlineGraceUntil?: Date;
}
