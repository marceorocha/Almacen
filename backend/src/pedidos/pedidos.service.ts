import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticuloTipo } from '../common/enums/articulo-tipo.enum';
import { MovimientoEstado } from '../common/enums/movimiento-estado.enum';
import { MovimientoTipo } from '../common/enums/movimiento-tipo.enum';
import { PedidoEstado } from '../common/enums/pedido-estado.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { assertAlmacenAccess } from '../common/utils/almacen-scope.util';
import { MovimientosService } from '../movimientos/movimientos.service';
import { User } from '../users/entities/user.entity';
import { AprobarPedidoDto } from './dto/aprobar-pedido.dto';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { PedidoDetalle } from './entities/pedido-detalle.entity';
import { Pedido } from './entities/pedido.entity';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidosRepository: Repository<Pedido>,
    @InjectRepository(PedidoDetalle)
    private readonly detalleRepository: Repository<PedidoDetalle>,
    private readonly movimientosService: MovimientosService,
  ) {}

  async create(dto: CreatePedidoDto, user: User): Promise<Pedido> {
    const pedido = await this.pedidosRepository.save(
      this.pedidosRepository.create({
        usuarioId: user.id,
        estado: PedidoEstado.PENDIENTE,
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
        movimientoReservaId: null,
      }),
    );
    const detalles = dto.detalles.map((d) =>
      this.detalleRepository.create({
        pedidoId: pedido.id,
        articuloId: d.articuloId,
        cantidad: d.cantidad,
      }),
    );
    await this.detalleRepository.save(detalles);
    return this.findOneById(pedido.id);
  }

  async findAllForUser(user: User): Promise<Pedido[]> {
    const qb = this.pedidosRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.detalles', 'd')
      .leftJoinAndSelect('d.articulo', 'articulo')
      .leftJoinAndSelect('p.usuario', 'usuario')
      .orderBy('p.fecha', 'DESC')
      .addOrderBy('p.createdAt', 'DESC');
    if (user.role === UserRole.USER) {
      qb.andWhere('p.usuarioId = :uid', { uid: user.id });
    }
    return qb.getMany();
  }

  async findOneForUser(id: string, user: User): Promise<Pedido> {
    const pedido = await this.findOneById(id);
    this.assertPedidoReadAccess(user, pedido);
    return pedido;
  }

  async aprobar(
    id: string,
    dto: AprobarPedidoDto | undefined,
    user: User,
  ): Promise<Pedido> {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.ALMACEN) {
      throw new ForbiddenException('Only warehouse staff can approve orders');
    }
    const pedido = await this.findOneById(id);
    if (pedido.estado !== PedidoEstado.PENDIENTE) {
      throw new BadRequestException('Only pending orders can be approved');
    }
    await this.assertDetallesOnlyNoTrazable(pedido);
    const almacenOrigenId =
      user.role === UserRole.ADMIN
        ? dto?.almacenOrigenId
        : user.almacenId ?? undefined;
    if (!almacenOrigenId) {
      throw new BadRequestException(
        user.role === UserRole.ADMIN
          ? 'almacenOrigenId is required when approving as admin'
          : 'Approver must be assigned to a warehouse',
      );
    }
    assertAlmacenAccess(user, almacenOrigenId);
    const movimiento = await this.movimientosService.create(
      {
        tipo: MovimientoTipo.SALIDA,
        almacenOrigenId,
        detalles: pedido.detalles.map((d) => ({
          articuloId: d.articuloId,
          cantidad: d.cantidad,
        })),
        estado: MovimientoEstado.RESERVADO,
      },
      user,
    );
    pedido.estado = PedidoEstado.APROBADO;
    pedido.movimientoReservaId = movimiento.id;
    return this.pedidosRepository.save(pedido);
  }

  async rechazar(id: string, user: User): Promise<Pedido> {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.ALMACEN) {
      throw new ForbiddenException('Only warehouse staff can reject orders');
    }
    const pedido = await this.findOneById(id);
    if (pedido.estado !== PedidoEstado.PENDIENTE) {
      throw new BadRequestException('Only pending orders can be rejected');
    }
    pedido.estado = PedidoEstado.RECHAZADO;
    return this.pedidosRepository.save(pedido);
  }

  private async findOneById(id: string): Promise<Pedido> {
    const pedido = await this.pedidosRepository.findOne({
      where: { id },
      relations: {
        detalles: { articulo: true },
        usuario: true,
        movimientoReserva: true,
      },
    });
    if (!pedido) {
      throw new NotFoundException('Order not found');
    }
    return pedido;
  }

  private assertPedidoReadAccess(user: User, pedido: Pedido): void {
    if (user.role === UserRole.ADMIN || user.role === UserRole.ALMACEN) {
      return;
    }
    if (pedido.usuarioId !== user.id) {
      throw new ForbiddenException('No access to this order');
    }
  }

  private async assertDetallesOnlyNoTrazable(pedido: Pedido): Promise<void> {
    for (const d of pedido.detalles) {
      if (d.articulo?.tipo === ArticuloTipo.TRAZABLE) {
        throw new BadRequestException(
          'Orders with traceable articles cannot be auto-approved with stock reservation yet',
        );
      }
    }
  }
}
