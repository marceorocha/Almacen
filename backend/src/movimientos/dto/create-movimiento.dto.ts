import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MovimientoEstado } from '../../common/enums/movimiento-estado.enum';
import { MovimientoTipo } from '../../common/enums/movimiento-tipo.enum';
import { MovimientoDetalleInputDto } from './movimiento-detalle-input.dto';

export class CreateMovimientoDto {
  @IsEnum(MovimientoTipo)
  tipo: MovimientoTipo;

  @IsOptional()
  @IsUUID()
  almacenOrigenId?: string | null;

  @IsOptional()
  @IsUUID()
  almacenDestinoId?: string | null;

  @IsOptional()
  @IsEnum(MovimientoEstado)
  estado?: MovimientoEstado;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  pdfUrl?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MovimientoDetalleInputDto)
  detalles: MovimientoDetalleInputDto[];
}
