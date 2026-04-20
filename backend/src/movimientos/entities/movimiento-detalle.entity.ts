import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ArticuloSerie } from '../../articulo-serie/entities/articulo-serie.entity';
import { Articulo } from '../../articulos/entities/articulo.entity';
import { Movimiento } from './movimiento.entity';

@Entity('movimiento_detalles')
export class MovimientoDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  movimientoId: string;

  @ManyToOne(() => Movimiento, (m) => m.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movimientoId' })
  movimiento: Movimiento;

  @Column({ type: 'uuid' })
  articuloId: string;

  @ManyToOne(() => Articulo, (a) => a.movimientoDetalles, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'articuloId' })
  articulo: Articulo;

  @Column({ type: 'decimal', precision: 14, scale: 3 })
  cantidad: string;

  /** New serial on traceable **entrada** when `serieId` is not used. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  numeroSerie: string | null;

  @Column({ type: 'uuid', nullable: true })
  serieId: string | null;

  @ManyToOne(() => ArticuloSerie, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'serieId' })
  serie: ArticuloSerie | null;
}
