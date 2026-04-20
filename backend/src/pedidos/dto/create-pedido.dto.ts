import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { PedidoDetalleInputDto } from './pedido-detalle-input.dto';

export class CreatePedidoDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PedidoDetalleInputDto)
  detalles: PedidoDetalleInputDto[];
}
