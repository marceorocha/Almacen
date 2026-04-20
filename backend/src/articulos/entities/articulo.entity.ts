import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ArticuloTipo } from '../../common/enums/articulo-tipo.enum';
import { MovimientoDetalle } from '../../movimientos/entities/movimiento-detalle.entity';
import { ArticuloSerie } from '../../articulo-serie/entities/articulo-serie.entity';
import { Stock } from '../../stock/entities/stock.entity';
import { PedidoDetalle } from '../../pedidos/entities/pedido-detalle.entity';

@Entity('articulos')
export class Articulo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  codigoInterno: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  codigoProveedor: string | null;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'enum', enum: ArticuloTipo })
  tipo: ArticuloTipo;

  @Column({ type: 'varchar', length: 120 })
  categoria: string;

  @Column({ type: 'decimal', precision: 14, scale: 3, default: 0 })
  stockMinimo: string;

  @OneToMany(() => MovimientoDetalle, (d) => d.articulo)
  movimientoDetalles: MovimientoDetalle[];

  @OneToMany(() => Stock, (s) => s.articulo)
  stocks: Stock[];

  @OneToMany(() => ArticuloSerie, (s) => s.articulo)
  series: ArticuloSerie[];

  @OneToMany(() => PedidoDetalle, (d) => d.articulo)
  pedidoDetalles: PedidoDetalle[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
