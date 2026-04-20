import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';
import { User } from '../../users/entities/user.entity';

export function assertAlmacenAccess(user: User, almacenId: string): void {
  if (user.role === UserRole.ADMIN) {
    return;
  }
  if (!user.almacenId || user.almacenId !== almacenId) {
    throw new ForbiddenException('No access to this warehouse');
  }
}
