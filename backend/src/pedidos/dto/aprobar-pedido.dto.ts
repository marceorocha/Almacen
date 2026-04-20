import { IsOptional, IsUUID } from 'class-validator';

export class AprobarPedidoDto {
  /** Required for admin when approving (warehouse that reserves stock). */
  @IsOptional()
  @IsUUID()
  almacenOrigenId?: string;
}
