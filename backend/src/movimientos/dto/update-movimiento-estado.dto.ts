import { IsEnum } from 'class-validator';
import { MovimientoEstado } from '../../common/enums/movimiento-estado.enum';

export class UpdateMovimientoEstadoDto {
  @IsEnum(MovimientoEstado)
  estado: MovimientoEstado;
}
