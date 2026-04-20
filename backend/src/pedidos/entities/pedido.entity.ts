import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PedidoEstado } from '../../common/enums/pedido-estado.enum';
import { Movimiento } from '../../movimientos/entities/movimiento.entity';
import { User } from '../../users/entities/user.entity';
import { PedidoDetalle } from './pedido-detalle.entity';

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  usuarioId: string;

  @ManyToOne(() => User, (u) => u.pedidosCreados, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column({
    type: 'enum',
    enum: PedidoEstado,
    default: PedidoEstado.PENDIENTE,
  })
  estado: PedidoEstado;

  @Column({ type: 'timestamptz' })
  fecha: Date;

  @Column({ type: 'uuid', nullable: true })
  movimientoReservaId: string | null;

  @ManyToOne(() => Movimiento, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'movimientoReservaId' })
  movimientoReserva: Movimiento | null;

  @OneToMany(() => PedidoDetalle, (d) => d.pedido, { cascade: true })
  detalles: PedidoDetalle[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
