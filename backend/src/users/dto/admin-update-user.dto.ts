import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ValidateIf((o: AdminUpdateUserDto) => o.email !== undefined && o.email !== '')
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsUUID()
  almacenId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}
