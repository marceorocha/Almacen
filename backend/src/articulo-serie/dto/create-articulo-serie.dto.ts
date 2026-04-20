import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ArticuloSerieEstado } from '../../common/enums/articulo-serie-estado.enum';

export class CreateArticuloSerieDto {
  @IsUUID()
  articuloId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  numeroSerie: string;

  @IsUUID()
  almacenId: string;

  @IsOptional()
  @IsEnum(ArticuloSerieEstado)
  estado?: ArticuloSerieEstado;
}
