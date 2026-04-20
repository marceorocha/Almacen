import { IsNumberString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class MovimientoDetalleInputDto {
  @IsUUID()
  articuloId: string;

  @IsNumberString()
  cantidad: string;

  /** Required for traceable outbound / transfer lines. */
  @IsOptional()
  @IsUUID()
  serieId?: string | null;

  /**
   * For traceable **entrada** when receiving a new serial not yet in DB.
   * Ignored if `serieId` is set.
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  numeroSerie?: string;
}
