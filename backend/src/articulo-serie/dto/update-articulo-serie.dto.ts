import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ArticuloSerieEstado } from '../../common/enums/articulo-serie-estado.enum';

export class UpdateArticuloSerieDto {
  @IsOptional()
  @IsEnum(ArticuloSerieEstado)
  estado?: ArticuloSerieEstado;

  /** Change warehouse (e.g. after transfer); keep rules in service. */
  @IsOptional()
  @IsUUID()
  almacenId?: string;
}
