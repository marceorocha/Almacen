import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ArticuloSerieEstado } from '../../common/enums/articulo-serie-estado.enum';
import { Almacen } from '../../almacenes/entities/almacen.entity';
import { Articulo } from '../../articulos/entities/articulo.entity';

@Entity('articulo_series')
@Unique(['articuloId', 'numeroSerie'])
export class ArticuloSerie {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  numeroSerie: string;

  @Column({ type: 'enum', enum: ArticuloSerieEstado, default: ArticuloSerieEstado.DISPONIBLE })
  estado: ArticuloSerieEstado;

  @Column({ type: 'uuid' })
  articuloId: string;

  @ManyToOne(() => Articulo, (a) => a.series, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'articuloId' })
  articulo: Articulo;

  @Column({ type: 'uuid' })
  almacenId: string;

  @ManyToOne(() => Almacen, (a) => a.articuloSeries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'almacenId' })
  almacen: Almacen;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
