import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Articulo } from '../articulos/entities/articulo.entity';
import { ArticuloSerieController } from './articulo-serie.controller';
import { ArticuloSerieService } from './articulo-serie.service';
import { ArticuloSerie } from './entities/articulo-serie.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ArticuloSerie, Articulo])],
  controllers: [ArticuloSerieController],
  providers: [ArticuloSerieService],
  exports: [ArticuloSerieService],
})
export class ArticuloSerieModule {}
