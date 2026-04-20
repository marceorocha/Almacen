export type UserRole = 'admin' | 'almacen' | 'user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  almacenId: string | null;
}
