import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Almacen } from '../../almacenes/entities/almacen.entity';
import { Articulo } from '../../articulos/entities/articulo.entity';

@Entity('stock')
@Unique(['almacenId', 'articuloId'])
@Check(`"reservado" >= 0 AND "cantidad" >= "reservado"`)
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 14, scale: 3, default: 0 })
  cantidad: string;

  /** Units committed to orders / holds; not available for outbound until released. */
  @Column({ type: 'decimal', precision: 14, scale: 3, default: 0 })
  reservado: string;

  @Column({ type: 'uuid' })
  almacenId: string;

  @ManyToOne(() => Almacen, (a) => a.stocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'almacenId' })
  almacen: Almacen;

  @Column({ type: 'uuid' })
  articuloId: string;

  @ManyToOne(() => Articulo, (a) => a.stocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'articuloId' })
  articulo: Articulo;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
