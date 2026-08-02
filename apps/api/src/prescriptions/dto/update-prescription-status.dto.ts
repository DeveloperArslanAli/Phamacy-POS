import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePrescriptionStatusDto {
  @IsEnum(['pending', 'verified', 'dispensed', 'picked_up', 'reversed', 'cancelled'])
  status!: 'pending' | 'verified' | 'dispensed' | 'picked_up' | 'reversed' | 'cancelled';

  @IsOptional()
  @IsString()
  reason?: string;
}
