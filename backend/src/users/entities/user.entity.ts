import { Exclude } from 'class-transformer';
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
import { UserRole } from '../../common/enums/user-role.enum';
import { Almacen } from '../../almacenes/entities/almacen.entity';
import { Movimiento } from '../../movimientos/entities/movimiento.entity';
import { Pedido } from '../../pedidos/entities/pedido.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ select: false })
  password: string;

  @Exclude()
  @Column({ type: 'varchar', length: 64, nullable: true })
  passwordResetTokenHash: string | null;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  passwordResetExpiresAt: Date | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'uuid', nullable: true })
  almacenId: string | null;

  @ManyToOne(() => Almacen, (almacen) => almacen.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'almacenId' })
  almacen: Almacen | null;

  @OneToMany(() => Movimiento, (m) => m.usuario)
  movimientos: Movimiento[];

  @OneToMany(() => Pedido, (p) => p.usuario)
  pedidosCreados: Pedido[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
