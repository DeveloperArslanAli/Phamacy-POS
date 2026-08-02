import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsOptional()
  mrn?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  preferredName?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsBoolean()
  @IsOptional()
  smsOptIn?: boolean;

  @IsBoolean()
  @IsOptional()
  deceased?: boolean;

  // Clinical Profile
  @IsString()
  @IsOptional()
  allergies?: string;

  @IsString()
  @IsOptional()
  conditions?: string;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsString()
  @IsOptional()
  pregnancyStatus?: string;

  // Insurance details
  @IsString()
  @IsOptional()
  insBin?: string;

  @IsString()
  @IsOptional()
  insPcn?: string;

  @IsString()
  @IsOptional()
  insGroup?: string;

  @IsString()
  @IsOptional()
  insMemberId?: string;

  @IsString()
  @IsOptional()
  insRelationship?: string;

  @IsString()
  @IsOptional()
  insCopayPreference?: string;

  // Consent & HIPAA
  @IsBoolean()
  @IsOptional()
  hipaaSigned?: boolean;

  @IsString()
  @IsOptional()
  hipaaSignedDate?: string;

  @IsBoolean()
  @IsOptional()
  safetyCapWaiver?: boolean;

  @IsString()
  @IsOptional()
  safetyCapWaiverDate?: string;

  @IsString()
  @IsOptional()
  pickupAuthReps?: string;

  @IsString()
  @IsOptional()
  consentFlags?: string;
}
