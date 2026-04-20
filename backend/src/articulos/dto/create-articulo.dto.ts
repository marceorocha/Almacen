import { IsEnum, IsNumberString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ArticuloTipo } from '../../common/enums/articulo-tipo.enum';

export class CreateArticuloDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  codigoInterno: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  codigoProveedor?: string | null;

  @IsString()
  @MinLength(1)
  descripcion: string;

  @IsEnum(ArticuloTipo)
  tipo: ArticuloTipo;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  categoria: string;

  @IsOptional()
  @IsNumberString()
  stockMinimo?: string;
}
