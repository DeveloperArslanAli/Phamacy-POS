import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  deviceFingerprint!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
