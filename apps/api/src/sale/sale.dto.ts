export class CreateSaleDto {
  tenantId!: string;
  locationId!: string;
  cashierId!: string;
  totals!: number;
  status?: string;
}
