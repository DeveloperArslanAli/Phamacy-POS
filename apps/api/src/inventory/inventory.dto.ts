export class CreateInventoryItemDto {
  tenantId!: string;
  sku!: string;
  name!: string;
  type?: string;
}
