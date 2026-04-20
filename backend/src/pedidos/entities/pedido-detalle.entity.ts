import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Articulo } from '../../articulos/entities/articulo.entity';
import { Pedido } from './pedido.entity';

@Entity('pedido_detalles')
export class PedidoDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  pedidoId: string;

  @ManyToOne(() => Pedido, (p) => p.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedidoId' })
  pedido: Pedido;

  @Column({ type: 'uuid' })
  articuloId: string;

  @ManyToOne(() => Articulo, (a) => a.pedidoDetalles, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'articuloId' })
  articulo: Articulo;

  @Column({ type: 'decimal', precision: 14, scale: 3 })
  cantidad: string;
}
