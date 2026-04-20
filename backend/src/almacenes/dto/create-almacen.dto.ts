import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAlmacenDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  location: string;
}
