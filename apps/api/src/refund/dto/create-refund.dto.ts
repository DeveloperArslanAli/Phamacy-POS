import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateRefundDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  saleId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
