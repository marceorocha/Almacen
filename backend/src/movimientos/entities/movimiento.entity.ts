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
import { MovimientoEstado } from '../../common/enums/movimiento-estado.enum';
import { MovimientoTipo } from '../../common/enums/movimiento-tipo.enum';
import { Almacen } from '../../almacenes/entities/almacen.entity';
import { User } from '../../users/entities/user.entity';
import { MovimientoDetalle } from './movimiento-detalle.entity';

@Entity('movimientos')
export class Movimiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: MovimientoTipo })
  tipo: MovimientoTipo;

  @Column({
    type: 'enum',
    enum: MovimientoEstado,
    default: MovimientoEstado.PENDIENTE,
  })
  estado: MovimientoEstado;

  @Column({ type: 'uuid', nullable: true })
  almacenOrigenId: string | null;

  @ManyToOne(() => Almacen, (a) => a.movimientosOrigen, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'almacenOrigenId' })
  almacenOrigen: Almacen | null;

  @Column({ type: 'uuid', nullable: true })
  almacenDestinoId: string | null;

  @ManyToOne(() => Almacen, (a) => a.movimientosDestino, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'almacenDestinoId' })
  almacenDestino: Almacen | null;

  @Column({ type: 'uuid' })
  usuarioId: string;

  @ManyToOne(() => User, (u) => u.movimientos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column({ type: 'timestamptz' })
  fecha: Date;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  pdfUrl: string | null;

  @OneToMany(() => MovimientoDetalle, (d) => d.movimiento, { cascade: true })
  detalles: MovimientoDetalle[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
