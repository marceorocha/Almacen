import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Movimiento } from '../../movimientos/entities/movimiento.entity';
import { ArticuloSerie } from '../../articulo-serie/entities/articulo-serie.entity';
import { Stock } from '../../stock/entities/stock.entity';
@Entity('almacenes')
export class Almacen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 500 })
  location: string;

  @OneToMany(() => User, (user) => user.almacen)
  users: User[];

  @OneToMany(() => Movimiento, (m) => m.almacenOrigen)
  movimientosOrigen: Movimiento[];

  @OneToMany(() => Movimiento, (m) => m.almacenDestino)
  movimientosDestino: Movimiento[];

  @OneToMany(() => Stock, (s) => s.almacen)
  stocks: Stock[];

  @OneToMany(() => ArticuloSerie, (s) => s.almacen)
  articuloSeries: ArticuloSerie[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
