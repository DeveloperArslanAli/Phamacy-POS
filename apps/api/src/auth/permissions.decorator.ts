import { SetMetadata } from '@nestjs/common';
import { Permission } from './permissions';

export const Permissions = (...permissions: Permission[]) => SetMetadata('permissions', permissions);
