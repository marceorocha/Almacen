import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlmacenesController } from './almacenes.controller';
import { AlmacenesService } from './almacenes.service';
import { Almacen } from './entities/almacen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Almacen])],
  controllers: [AlmacenesController],
  providers: [AlmacenesService],
  exports: [AlmacenesService],
})
export class AlmacenesModule {}
