import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from '../stock/entities/stock.entity';
import { AlertasController } from './alertas.controller';
import { AlertasService } from './alertas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Stock])],
  controllers: [AlertasController],
  providers: [AlertasService],
})
export class AlertasModule {}
