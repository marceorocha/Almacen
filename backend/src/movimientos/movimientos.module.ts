import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticuloSerie } from '../articulo-serie/entities/articulo-serie.entity';
import { Articulo } from '../articulos/entities/articulo.entity';
import { Stock } from '../stock/entities/stock.entity';
import { MovimientoDetalle } from './entities/movimiento-detalle.entity';
import { Movimiento } from './entities/movimiento.entity';
import { MovimientoPdfService } from './movimiento-pdf.service';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Movimiento,
      MovimientoDetalle,
      Articulo,
      Stock,
      ArticuloSerie,
    ]),
  ],
  controllers: [MovimientosController],
  providers: [MovimientosService, MovimientoPdfService],
  exports: [MovimientosService],
})
export class MovimientosModule {}
