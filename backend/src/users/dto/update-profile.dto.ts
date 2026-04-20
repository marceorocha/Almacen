import { IsEmail, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ValidateIf((o: UpdateProfileDto) => o.email !== undefined && o.email !== '')
  @IsEmail()
  email?: string;
}
