import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { Stock } from '../stock/entities/stock.entity';
import { ArticulosController } from './articulos.controller';
import { ArticulosService } from './articulos.service';
import { Articulo } from './entities/articulo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Articulo, Stock]), MovimientosModule],
  controllers: [ArticulosController],
  providers: [ArticulosService],
  exports: [ArticulosService],
})
export class ArticulosModule {}
