import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticuloTipo } from '../common/enums/articulo-tipo.enum';
import { MovimientoEstado } from '../common/enums/movimiento-estado.enum';
import { MovimientoTipo } from '../common/enums/movimiento-tipo.enum';
import { assertAlmacenAccess } from '../common/utils/almacen-scope.util';
import { MovimientosService } from '../movimientos/movimientos.service';
import { Stock } from '../stock/entities/stock.entity';
import { User } from '../users/entities/user.entity';
import { CreateArticuloDto } from './dto/create-articulo.dto';
import { UpdateArticuloDto } from './dto/update-articulo.dto';
import { Articulo } from './entities/articulo.entity';

const dec = (n: number) => n.toFixed(3);

@Injectable()
export class ArticulosService {
  constructor(
    @InjectRepository(Articulo)
    private readonly articulosRepository: Repository<Articulo>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    private readonly movimientosService: MovimientosService,
  ) {}

  async create(dto: CreateArticuloDto, user: User): Promise<Articulo> {
    assertAlmacenAccess(user, dto.almacenInicialId);
    this.validateInitialStock(dto);

    const articulo = this.articulosRepository.create({
      codigoInterno: dto.codigoInterno,
      codigoProveedor: dto.codigoProveedor ?? null,
      descripcion: dto.descripcion,
      tipo: dto.tipo,
      categoria: dto.categoria,
      stockMinimo: dto.stockMinimo ?? '0',
    });
    const saved = await this.articulosRepository.save(articulo);

    const qty = Number(dto.cantidadInicial ?? '0');
    if (qty <= 0) {
      await this.ensureZeroStock(saved.id, dto.almacenInicialId);
      return this.findOne(saved.id);
    }

    const detalle =
      dto.tipo === ArticuloTipo.TRAZABLE
        ? {
            articuloId: saved.id,
            cantidad: '1',
            numeroSerie: dto.numeroSerieInicial!.trim(),
          }
        : {
            articuloId: saved.id,
            cantidad: dec(qty),
          };

    await this.movimientosService.create(
      {
        tipo: MovimientoTipo.ENTRADA,
        almacenDestinoId: dto.almacenInicialId,
        estado: MovimientoEstado.RECIBIDO,
        detalles: [detalle],
      },
      user,
    );

    return this.findOne(saved.id);
  }

  private validateInitialStock(dto: CreateArticuloDto): void {
    const qty = Number(dto.cantidadInicial ?? '0');
    if (!Number.isFinite(qty) || qty < 0) {
      throw new BadRequestException('cantidadInicial must be a non-negative number');
    }
    if (dto.tipo === ArticuloTipo.TRAZABLE) {
      if (qty !== 0 && qty !== 1) {
        throw new BadRequestException(
          'For traceable articles, initial quantity must be 0 or 1',
        );
      }
      if (qty === 1) {
        const s = dto.numeroSerieInicial?.trim();
        if (!s) {
          throw new BadRequestException(
            'numeroSerieInicial is required when receiving one traceable unit at creation',
          );
        }
      }
    }
  }

  private async ensureZeroStock(articuloId: string, almacenId: string): Promise<void> {
    const existing = await this.stockRepository.findOne({
      where: { articuloId, almacenId },
    });
    if (existing) {
      return;
    }
    await this.stockRepository.save(
      this.stockRepository.create({
        articuloId,
        almacenId,
        cantidad: dec(0),
        reservado: dec(0),
      }),
    );
  }

  async findAll(): Promise<Articulo[]> {
    return this.articulosRepository.find({ order: { codigoInterno: 'ASC' } });
  }

  async findOne(id: string): Promise<Articulo> {
    const articulo = await this.articulosRepository.findOne({ where: { id } });
    if (!articulo) {
      throw new NotFoundException('Article not found');
    }
    return articulo;
  }

  async update(id: string, dto: UpdateArticuloDto): Promise<Articulo> {
    const articulo = await this.findOne(id);
    Object.assign(articulo, dto);
    return this.articulosRepository.save(articulo);
  }

  async remove(id: string): Promise<void> {
    const res = await this.articulosRepository.delete(id);
    if (!res.affected) {
      throw new NotFoundException('Article not found');
    }
  }
}
