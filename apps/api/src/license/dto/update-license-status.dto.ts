import { IsEnum, IsString } from 'class-validator';

export class UpdateLicenseStatusDto {
  @IsEnum(['active', 'suspended', 'expired', 'revoked'])
  status!: 'active' | 'suspended' | 'expired' | 'revoked';
}
