import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ArticuloSerie } from '../articulo-serie/entities/articulo-serie.entity';
import { ArticuloSerieEstado } from '../common/enums/articulo-serie-estado.enum';
import { ArticuloTipo } from '../common/enums/articulo-tipo.enum';
import { MovimientoEstado } from '../common/enums/movimiento-estado.enum';
import { MovimientoTipo } from '../common/enums/movimiento-tipo.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { assertAlmacenAccess } from '../common/utils/almacen-scope.util';
import { Articulo } from '../articulos/entities/articulo.entity';
import { User } from '../users/entities/user.entity';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { UpdateMovimientoEstadoDto } from './dto/update-movimiento-estado.dto';
import { MovimientoDetalle } from './entities/movimiento-detalle.entity';
import { Movimiento } from './entities/movimiento.entity';
import { MovimientoPdfService } from './movimiento-pdf.service';
import { Stock } from '../stock/entities/stock.entity';

const dec = (n: number) => n.toFixed(3);

@Injectable()
export class MovimientosService {
  constructor(
    @InjectRepository(Movimiento)
    private readonly movimientoRepository: Repository<Movimiento>,
    @InjectRepository(MovimientoDetalle)
    private readonly detalleRepository: Repository<MovimientoDetalle>,
    @InjectRepository(Articulo)
    private readonly articuloRepository: Repository<Articulo>,
    private readonly dataSource: DataSource,
    private readonly movimientoPdfService: MovimientoPdfService,
  ) {}

  async create(dto: CreateMovimientoDto, user: User): Promise<Movimiento> {
    if (user.role === UserRole.USER) {
      throw new ForbiddenException('Users cannot register movements');
    }
    this.validateWarehouseIds(dto);
    this.assertWarehouseAccessForCreate(user, dto);
    const targetEstado = dto.estado ?? MovimientoEstado.PENDIENTE;
    if (
      dto.tipo === MovimientoTipo.TRANSFERENCIA &&
      targetEstado !== MovimientoEstado.PENDIENTE
    ) {
      throw new BadRequestException(
        'Transfers must be created in estado pendiente; advance the workflow with PATCH estado.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      await this.validateDetalles(manager, dto);
      const mov = manager.getRepository(Movimiento).create({
        tipo: dto.tipo,
        estado: MovimientoEstado.PENDIENTE,
        almacenOrigenId: dto.almacenOrigenId ?? null,
        almacenDestinoId: dto.almacenDestinoId ?? null,
        usuarioId: user.id,
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
        pdfUrl: dto.pdfUrl ?? null,
      });
      const saved = await manager.getRepository(Movimiento).save(mov);
      const detalles = dto.detalles.map((d) =>
        manager.getRepository(MovimientoDetalle).create({
          movimientoId: saved.id,
          articuloId: d.articuloId,
          cantidad: d.cantidad,
          serieId: d.serieId ?? null,
          numeroSerie: d.numeroSerie?.trim() ?? null,
        }),
      );
      await manager.getRepository(MovimientoDetalle).save(detalles);
      if (targetEstado !== MovimientoEstado.PENDIENTE) {
        this.assertCanTransition(dto.tipo, MovimientoEstado.PENDIENTE, targetEstado);
        await this.applyTransitionEffects(
          manager,
          saved.id,
          dto.tipo,
          MovimientoEstado.PENDIENTE,
          targetEstado,
        );
        await manager
          .getRepository(Movimiento)
          .update({ id: saved.id }, { estado: targetEstado });
      }
      return this.findOneWithRelations(saved.id, manager);
    });
  }

  async updateEstado(
    id: string,
    dto: UpdateMovimientoEstadoDto,
    user: User,
  ): Promise<Movimiento> {
    if (user.role === UserRole.USER) {
      throw new ForbiddenException('Users cannot change movement status');
    }
    return this.dataSource.transaction(async (manager) => {
      const mov = await this.findOneWithRelations(id, manager);
      this.assertWarehouseAccessForMovimiento(user, mov);
      if (mov.estado === dto.estado) {
        return mov;
      }
      this.assertCanTransition(mov.tipo, mov.estado, dto.estado);
      this.assertTransferTransitionActor(user, mov, mov.estado, dto.estado);
      await this.applyTransitionEffects(
        manager,
        id,
        mov.tipo,
        mov.estado,
        dto.estado,
      );
      await manager.getRepository(Movimiento).update({ id }, { estado: dto.estado });
      return this.findOneWithRelations(id, manager);
    });
  }

  async findOneForUser(id: string, user: User): Promise<Movimiento> {
    const mov = await this.findOneWithRelations(id);
    this.assertWarehouseAccessForMovimiento(user, mov);
    return mov;
  }

  async generatePdf(id: string, user: User): Promise<Movimiento> {
    if (user.role === UserRole.USER) {
      throw new ForbiddenException('Users cannot generate movement PDFs');
    }
    const mov = await this.findOneWithRelations(id);
    this.assertWarehouseAccessForMovimiento(user, mov);
    if (
      mov.tipo === MovimientoTipo.TRANSFERENCIA &&
      mov.estado !== MovimientoEstado.PENDIENTE
    ) {
      throw new BadRequestException(
        'Transfer PDF must be generated while the movement is pendiente (before dispatch).',
      );
    }
    const pdfUrl = await this.movimientoPdfService.writeMovementPdf(mov);
    await this.movimientoRepository.update({ id }, { pdfUrl });
    return this.findOneWithRelations(id);
  }

  /** Destination warehouse confirms reception (transfer en_transito → recibido). */
  async confirmTransferReception(id: string, user: User): Promise<Movimiento> {
    return this.updateEstado(
      id,
      { estado: MovimientoEstado.RECIBIDO },
      user,
    );
  }

  async listForUser(user: User, almacenId?: string): Promise<Movimiento[]> {
    const qb = this.movimientoRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.detalles', 'd')
      .leftJoinAndSelect('d.articulo', 'articulo')
      .leftJoinAndSelect('d.serie', 'serie')
      .orderBy('m.fecha', 'DESC')
      .addOrderBy('m.createdAt', 'DESC');
    if (user.role === UserRole.ADMIN) {
      if (almacenId) {
        qb.andWhere(
          '(m.almacenOrigenId = :aid OR m.almacenDestinoId = :aid)',
          { aid: almacenId },
        );
      }
      return qb.getMany();
    }
    if (!user.almacenId) {
      throw new ForbiddenException('User is not assigned to a warehouse');
    }
    const aid = almacenId ?? user.almacenId;
    qb.andWhere(
      '(m.almacenOrigenId = :aid OR m.almacenDestinoId = :aid)',
      { aid },
    );
    return qb.getMany();
  }

  private validateWarehouseIds(dto: CreateMovimientoDto): void {
    if (dto.tipo === MovimientoTipo.ENTRADA) {
      if (!dto.almacenDestinoId) {
        throw new BadRequestException('almacenDestinoId is required for entrada');
      }
    } else if (dto.tipo === MovimientoTipo.SALIDA) {
      if (!dto.almacenOrigenId) {
        throw new BadRequestException('almacenOrigenId is required for salida');
      }
    } else if (dto.tipo === MovimientoTipo.TRANSFERENCIA) {
      if (!dto.almacenOrigenId || !dto.almacenDestinoId) {
        throw new BadRequestException(
          'almacenOrigenId and almacenDestinoId are required for transferencia',
        );
      }
      if (dto.almacenOrigenId === dto.almacenDestinoId) {
        throw new BadRequestException('Origin and destination must differ');
      }
    }
  }

  private assertWarehouseAccessForCreate(
    user: User,
    dto: CreateMovimientoDto,
  ): void {
    if (dto.almacenOrigenId) {
      assertAlmacenAccess(user, dto.almacenOrigenId);
    }
    if (dto.almacenDestinoId) {
      assertAlmacenAccess(user, dto.almacenDestinoId);
    }
    if (user.role === UserRole.ADMIN) {
      return;
    }
    if (!dto.almacenOrigenId && !dto.almacenDestinoId) {
      throw new ForbiddenException('No warehouse in movement');
    }
  }

  private assertWarehouseAccessForMovimiento(
    user: User,
    mov: Movimiento,
  ): void {
    if (user.role === UserRole.ADMIN) {
      return;
    }
    const ids = [mov.almacenOrigenId, mov.almacenDestinoId].filter(Boolean);
    if (!user.almacenId || !ids.includes(user.almacenId)) {
      throw new ForbiddenException('No access to this movement');
    }
  }

  /**
   * Transfer workflow: PDF while pendiente → en_transito (origin + PDF) →
   * recibido (destination confirms stock receipt) / rechazado en tránsito (origin).
   */
  private assertTransferTransitionActor(
    user: User,
    mov: Movimiento,
    from: MovimientoEstado,
    to: MovimientoEstado,
  ): void {
    if (mov.tipo !== MovimientoTipo.TRANSFERENCIA) {
      return;
    }
    if (user.role === UserRole.ADMIN) {
      return;
    }
    if (!user.almacenId) {
      throw new ForbiddenException('User is not assigned to a warehouse');
    }
    if (
      to === MovimientoEstado.RESERVADO &&
      from === MovimientoEstado.PENDIENTE
    ) {
      if (mov.almacenOrigenId !== user.almacenId) {
        throw new ForbiddenException(
          'Only origin warehouse staff can reserve stock for a transfer',
        );
      }
      return;
    }
    if (
      from === MovimientoEstado.RESERVADO &&
      (to === MovimientoEstado.PENDIENTE || to === MovimientoEstado.RECHAZADO)
    ) {
      if (mov.almacenOrigenId !== user.almacenId) {
        throw new ForbiddenException(
          'Only origin warehouse staff can release or reject a reserved transfer',
        );
      }
      return;
    }
    if (
      to === MovimientoEstado.EN_TRANSITO &&
      (from === MovimientoEstado.PENDIENTE || from === MovimientoEstado.RESERVADO)
    ) {
      if (mov.almacenOrigenId !== user.almacenId) {
        throw new ForbiddenException(
          'Only origin warehouse staff can dispatch a transfer (en_transito)',
        );
      }
      if (!mov.pdfUrl?.trim()) {
        throw new BadRequestException(
          'Generate the transfer PDF (POST …/pdf) before marking as en_transito',
        );
      }
      return;
    }
    if (to === MovimientoEstado.RECIBIDO && from === MovimientoEstado.EN_TRANSITO) {
      if (!mov.almacenDestinoId || mov.almacenDestinoId !== user.almacenId) {
        throw new ForbiddenException(
          'Only destination warehouse staff can confirm reception (recibido)',
        );
      }
      return;
    }
    if (to === MovimientoEstado.RECHAZADO && from === MovimientoEstado.EN_TRANSITO) {
      if (!mov.almacenOrigenId || mov.almacenOrigenId !== user.almacenId) {
        throw new ForbiddenException(
          'Only origin warehouse staff can reject a transfer still in transit',
        );
      }
    }
  }

  private async findOneWithRelations(
    id: string,
    manager?: EntityManager,
  ): Promise<Movimiento> {
    const repo = manager
      ? manager.getRepository(Movimiento)
      : this.movimientoRepository;
    const mov = await repo.findOne({
      where: { id },
      relations: {
        detalles: { articulo: true, serie: true },
        almacenOrigen: true,
        almacenDestino: true,
        usuario: true,
      },
    });
    if (!mov) {
      throw new NotFoundException('Movement not found');
    }
    return mov;
  }

  private assertCanTransition(
    tipo: MovimientoTipo,
    from: MovimientoEstado,
    to: MovimientoEstado,
  ): void {
    const allowed = this.allowedTargets(tipo, from);
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Invalid transition from ${from} to ${to} for ${tipo}`,
      );
    }
  }

  private allowedTargets(
    tipo: MovimientoTipo,
    from: MovimientoEstado,
  ): MovimientoEstado[] {
    if (from === MovimientoEstado.RECIBIDO || from === MovimientoEstado.RECHAZADO) {
      return [];
    }
    if (from === MovimientoEstado.PENDIENTE) {
      if (tipo === MovimientoTipo.ENTRADA) {
        return [
          MovimientoEstado.EN_TRANSITO,
          MovimientoEstado.RECIBIDO,
          MovimientoEstado.RECHAZADO,
        ];
      }
      if (tipo === MovimientoTipo.TRANSFERENCIA) {
        return [
          MovimientoEstado.RESERVADO,
          MovimientoEstado.EN_TRANSITO,
          MovimientoEstado.RECHAZADO,
        ];
      }
      return [
        MovimientoEstado.RESERVADO,
        MovimientoEstado.EN_TRANSITO,
        MovimientoEstado.RECIBIDO,
        MovimientoEstado.RECHAZADO,
      ];
    }
    if (from === MovimientoEstado.RESERVADO) {
      const next = [
        MovimientoEstado.PENDIENTE,
        MovimientoEstado.EN_TRANSITO,
        MovimientoEstado.RECIBIDO,
        MovimientoEstado.RECHAZADO,
      ];
      if (tipo === MovimientoTipo.TRANSFERENCIA) {
        return next.filter((s) => s !== MovimientoEstado.RECIBIDO);
      }
      return next;
    }
    if (from === MovimientoEstado.EN_TRANSITO) {
      return [MovimientoEstado.RECIBIDO, MovimientoEstado.RECHAZADO];
    }
    return [];
  }

  private async applyTransitionEffects(
    manager: EntityManager,
    movimientoId: string,
    tipo: MovimientoTipo,
    from: MovimientoEstado,
    to: MovimientoEstado,
  ): Promise<void> {
    const mov = await this.findOneWithRelations(movimientoId, manager);
    if (mov.estado !== from) {
      throw new BadRequestException('Movement state does not match transition');
    }
    if (to === MovimientoEstado.RESERVADO) {
      await this.reserveAtOrigin(manager, mov);
      return;
    }
    if (from === MovimientoEstado.RESERVADO && to === MovimientoEstado.PENDIENTE) {
      await this.unreserveAtOrigin(manager, mov);
      return;
    }
    if (to === MovimientoEstado.EN_TRANSITO) {
      if (tipo === MovimientoTipo.ENTRADA) {
        return;
      }
      await this.consumeOrigin(manager, mov, from === MovimientoEstado.RESERVADO);
      return;
    }
    if (to === MovimientoEstado.RECIBIDO) {
      if (tipo === MovimientoTipo.ENTRADA) {
        await this.receiveEntrada(manager, mov);
        return;
      }
      if (tipo === MovimientoTipo.SALIDA) {
        if (from !== MovimientoEstado.EN_TRANSITO) {
          await this.consumeOrigin(manager, mov, from === MovimientoEstado.RESERVADO, {
            traceSalidaEntregado: true,
          });
        } else {
          await this.finalizeSalidaTrazable(manager, mov);
        }
        return;
      }
      if (tipo === MovimientoTipo.TRANSFERENCIA && from === MovimientoEstado.EN_TRANSITO) {
        await this.receiveTransferAtDestination(manager, mov);
      }
      return;
    }
    if (to === MovimientoEstado.RECHAZADO) {
      if (from === MovimientoEstado.RESERVADO) {
        await this.unreserveAtOrigin(manager, mov);
        return;
      }
      if (from === MovimientoEstado.EN_TRANSITO) {
        await this.revertTransitToOrigin(manager, mov, tipo);
      }
    }
  }

  private async validateDetalles(
    manager: EntityManager,
    dto: CreateMovimientoDto,
  ): Promise<void> {
    for (const line of dto.detalles) {
      const articulo = await manager.getRepository(Articulo).findOne({
        where: { id: line.articuloId },
      });
      if (!articulo) {
        throw new BadRequestException(`Article ${line.articuloId} not found`);
      }
      const qty = Number(line.cantidad);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new BadRequestException('Each line must have a positive cantidad');
      }
      if (articulo.tipo === ArticuloTipo.TRAZABLE) {
        if (qty !== 1) {
          throw new BadRequestException(
            'Traceable lines must have cantidad 1 per serial',
          );
        }
        if (dto.tipo === MovimientoTipo.ENTRADA) {
          if (!line.serieId && !line.numeroSerie?.trim()) {
            throw new BadRequestException(
              'Traceable entrada requires serieId or numeroSerie',
            );
          }
          if (line.serieId && line.numeroSerie?.trim()) {
            throw new BadRequestException('Use either serieId or numeroSerie, not both');
          }
        } else {
          if (!line.serieId) {
            throw new BadRequestException('Traceable salida/transfer requires serieId');
          }
        }
      } else {
        if (line.serieId || line.numeroSerie?.trim()) {
          throw new BadRequestException('Non-traceable lines must not include serial fields');
        }
      }
    }
  }

  private async loadStock(
    manager: EntityManager,
    almacenId: string,
    articuloId: string,
  ): Promise<Stock> {
    const repo = manager.getRepository(Stock);
    let row = await repo.findOne({ where: { almacenId, articuloId } });
    if (!row) {
      row = repo.create({
        almacenId,
        articuloId,
        cantidad: '0',
        reservado: '0',
      });
      row = await repo.save(row);
    }
    return row;
  }

  private async reserveAtOrigin(
    manager: EntityManager,
    mov: Movimiento,
  ): Promise<void> {
    const origen = mov.almacenOrigenId;
    if (!origen) {
      throw new BadRequestException('Reservation requires almacenOrigenId');
    }
    for (const line of mov.detalles) {
      const tipoArt = line.articulo.tipo;
      if (tipoArt === ArticuloTipo.NO_TRAZABLE) {
        const stock = await this.loadStock(manager, origen, line.articuloId);
        const qty = Number(line.cantidad);
        const cant = Number(stock.cantidad);
        const res = Number(stock.reservado);
        if (cant - res < qty) {
          throw new BadRequestException(
            `Insufficient available stock for article ${line.articuloId}`,
          );
        }
        stock.reservado = dec(res + qty);
        await manager.getRepository(Stock).save(stock);
      } else {
        const serie = await this.loadSerieForLine(manager, line, origen);
        if (serie.estado !== ArticuloSerieEstado.DISPONIBLE) {
          throw new BadRequestException(`Serial ${serie.id} is not available to reserve`);
        }
        serie.estado = ArticuloSerieEstado.RESERVADO;
        await manager.getRepository(ArticuloSerie).save(serie);
      }
    }
  }

  private async unreserveAtOrigin(
    manager: EntityManager,
    mov: Movimiento,
  ): Promise<void> {
    const origen = mov.almacenOrigenId;
    if (!origen) {
      return;
    }
    for (const line of mov.detalles) {
      if (line.articulo.tipo === ArticuloTipo.NO_TRAZABLE) {
        const stock = await this.loadStock(manager, origen, line.articuloId);
        const qty = Number(line.cantidad);
        let res = Number(stock.reservado);
        res = Math.max(0, res - qty);
        stock.reservado = dec(res);
        await manager.getRepository(Stock).save(stock);
      } else {
        const serie = await this.loadSerieForLine(manager, line, origen);
        if (serie.estado === ArticuloSerieEstado.RESERVADO) {
          serie.estado = ArticuloSerieEstado.DISPONIBLE;
          await manager.getRepository(ArticuloSerie).save(serie);
        }
      }
    }
  }

  private async consumeOrigin(
    manager: EntityManager,
    mov: Movimiento,
    fromReserved: boolean,
    options?: { traceSalidaEntregado?: boolean },
  ): Promise<void> {
    const origen = mov.almacenOrigenId;
    if (!origen) {
      throw new BadRequestException('Movement requires almacenOrigenId');
    }
    for (const line of mov.detalles) {
      if (line.articulo.tipo === ArticuloTipo.NO_TRAZABLE) {
        const stock = await this.loadStock(manager, origen, line.articuloId);
        const qty = Number(line.cantidad);
        let cant = Number(stock.cantidad);
        let res = Number(stock.reservado);
        if (fromReserved) {
          if (res < qty) {
            throw new BadRequestException('Reserved quantity insufficient');
          }
          res -= qty;
          cant -= qty;
        } else {
          if (cant - res < qty) {
            throw new BadRequestException('Insufficient unreserved stock');
          }
          cant -= qty;
        }
        stock.cantidad = dec(cant);
        stock.reservado = dec(res);
        await manager.getRepository(Stock).save(stock);
      } else {
        const serie = await this.loadSerieForLine(manager, line, origen);
        if (mov.tipo === MovimientoTipo.SALIDA) {
          serie.estado = options?.traceSalidaEntregado
            ? ArticuloSerieEstado.ENTREGADO
            : ArticuloSerieEstado.EN_TRANSITO;
        } else {
          serie.estado = ArticuloSerieEstado.EN_TRANSITO;
        }
        await manager.getRepository(ArticuloSerie).save(serie);
      }
    }
  }

  private async receiveEntrada(
    manager: EntityManager,
    mov: Movimiento,
  ): Promise<void> {
    const dest = mov.almacenDestinoId;
    if (!dest) {
      throw new BadRequestException('entrada requires almacenDestinoId');
    }
    for (const line of mov.detalles) {
      if (line.articulo.tipo === ArticuloTipo.NO_TRAZABLE) {
        const stock = await this.loadStock(manager, dest, line.articuloId);
        const qty = Number(line.cantidad);
        stock.cantidad = dec(Number(stock.cantidad) + qty);
        await manager.getRepository(Stock).save(stock);
      } else if (line.serieId) {
        const serie = await manager.getRepository(ArticuloSerie).findOne({
          where: { id: line.serieId },
        });
        if (!serie || serie.articuloId !== line.articuloId) {
          throw new BadRequestException('Invalid serie for entrada');
        }
        serie.almacenId = dest;
        serie.estado = ArticuloSerieEstado.DISPONIBLE;
        await manager.getRepository(ArticuloSerie).save(serie);
      } else if (line.numeroSerie) {
        const repo = manager.getRepository(ArticuloSerie);
        const created = repo.create({
          articuloId: line.articuloId,
          numeroSerie: line.numeroSerie.trim(),
          almacenId: dest,
          estado: ArticuloSerieEstado.DISPONIBLE,
        });
        await repo.save(created);
      }
    }
  }

  private async receiveTransferAtDestination(
    manager: EntityManager,
    mov: Movimiento,
  ): Promise<void> {
    const dest = mov.almacenDestinoId;
    if (!dest) {
      throw new BadRequestException('transferencia requires almacenDestinoId');
    }
    for (const line of mov.detalles) {
      if (line.articulo.tipo === ArticuloTipo.NO_TRAZABLE) {
        const stock = await this.loadStock(manager, dest, line.articuloId);
        const qty = Number(line.cantidad);
        stock.cantidad = dec(Number(stock.cantidad) + qty);
        await manager.getRepository(Stock).save(stock);
      } else {
        const serie = await manager.getRepository(ArticuloSerie).findOne({
          where: { id: line.serieId! },
        });
        if (!serie || serie.articuloId !== line.articuloId) {
          throw new BadRequestException('Invalid serie for transfer receipt');
        }
        serie.almacenId = dest;
        serie.estado = ArticuloSerieEstado.DISPONIBLE;
        await manager.getRepository(ArticuloSerie).save(serie);
      }
    }
  }

  private async revertTransitToOrigin(
    manager: EntityManager,
    mov: Movimiento,
    tipo: MovimientoTipo,
  ): Promise<void> {
    const origen = mov.almacenOrigenId;
    if (!origen) {
      return;
    }
    for (const line of mov.detalles) {
      if (line.articulo.tipo === ArticuloTipo.NO_TRAZABLE) {
        const stock = await this.loadStock(manager, origen, line.articuloId);
        const qty = Number(line.cantidad);
        stock.cantidad = dec(Number(stock.cantidad) + qty);
        await manager.getRepository(Stock).save(stock);
      } else {
        const serie = await manager.getRepository(ArticuloSerie).findOne({
          where: { id: line.serieId! },
        });
        if (!serie) {
          throw new BadRequestException('Serial not found for revert');
        }
        serie.almacenId = origen;
        serie.estado = ArticuloSerieEstado.DISPONIBLE;
        await manager.getRepository(ArticuloSerie).save(serie);
      }
    }
  }

  private async finalizeSalidaTrazable(
    manager: EntityManager,
    mov: Movimiento,
  ): Promise<void> {
    for (const line of mov.detalles) {
      if (line.articulo.tipo !== ArticuloTipo.TRAZABLE || !line.serieId) {
        continue;
      }
      const serie = await manager.getRepository(ArticuloSerie).findOne({
        where: { id: line.serieId },
      });
      if (serie && serie.articuloId === line.articuloId) {
        serie.estado = ArticuloSerieEstado.ENTREGADO;
        await manager.getRepository(ArticuloSerie).save(serie);
      }
    }
  }

  private async loadSerieForLine(
    manager: EntityManager,
    line: MovimientoDetalle,
    expectedAlmacenId: string,
  ): Promise<ArticuloSerie> {
    if (!line.serieId) {
      throw new BadRequestException('serieId required for traceable line');
    }
    const serie = await manager.getRepository(ArticuloSerie).findOne({
      where: { id: line.serieId },
    });
    if (!serie || serie.articuloId !== line.articuloId) {
      throw new BadRequestException('Serial does not match article');
    }
    if (serie.almacenId !== expectedAlmacenId) {
      throw new BadRequestException('Serial is not in the expected warehouse');
    }
    return serie;
  }
}
