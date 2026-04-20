import { IsEnum, IsNumberString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
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

  /** Warehouse where the article first exists (stock row + optional entrada). */
  @IsUUID()
  almacenInicialId: string;

  /** Initial quantity in that warehouse; use 0 to register empty stock only. */
  @IsOptional()
  @IsNumberString()
  cantidadInicial?: string;

  /** Required if tipo is trazable and cantidadInicial is 1 (new serial at reception). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  numeroSerieInicial?: string;
}
