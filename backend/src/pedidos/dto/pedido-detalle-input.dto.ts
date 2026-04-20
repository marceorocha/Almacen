import { IsNumberString, IsUUID } from 'class-validator';

export class PedidoDetalleInputDto {
  @IsUUID()
  articuloId: string;

  @IsNumberString()
  cantidad: string;
}
