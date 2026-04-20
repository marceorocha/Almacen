import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticuloSerieEstado } from '../common/enums/articulo-serie-estado.enum';
import { ArticuloTipo } from '../common/enums/articulo-tipo.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { assertAlmacenAccess } from '../common/utils/almacen-scope.util';
import { Articulo } from '../articulos/entities/articulo.entity';
import { User } from '../users/entities/user.entity';
import { CreateArticuloSerieDto } from './dto/create-articulo-serie.dto';
import { UpdateArticuloSerieDto } from './dto/update-articulo-serie.dto';
import { ArticuloSerie } from './entities/articulo-serie.entity';

@Injectable()
export class ArticuloSerieService {
  constructor(
    @InjectRepository(ArticuloSerie)
    private readonly serieRepository: Repository<ArticuloSerie>,
    @InjectRepository(Articulo)
    private readonly articuloRepository: Repository<Articulo>,
  ) {}

  async create(dto: CreateArticuloSerieDto, user: User): Promise<ArticuloSerie> {
    assertAlmacenAccess(user, dto.almacenId);
    const articulo = await this.articuloRepository.findOne({
      where: { id: dto.articuloId },
    });
    if (!articulo) {
      throw new NotFoundException('Article not found');
    }
    if (articulo.tipo !== ArticuloTipo.TRAZABLE) {
      throw new BadRequestException(
        'Serial numbers only apply to traceable articles',
      );
    }
    try {
      const row = this.serieRepository.create({
        articuloId: dto.articuloId,
        numeroSerie: dto.numeroSerie.trim(),
        almacenId: dto.almacenId,
        estado: dto.estado ?? ArticuloSerieEstado.DISPONIBLE,
      });
      return await this.serieRepository.save(row);
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'Serial number already exists for this article',
        );
      }
      throw e;
    }
  }

  async findAllForUser(
    user: User,
    filters?: { almacenId?: string; articuloId?: string },
  ): Promise<ArticuloSerie[]> {
    const qb = this.serieRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.articulo', 'articulo')
      .orderBy('s.numeroSerie', 'ASC');

    if (user.role === UserRole.ADMIN) {
      if (filters?.almacenId) {
        qb.andWhere('s.almacenId = :almacenId', { almacenId: filters.almacenId });
      }
      if (filters?.articuloId) {
        qb.andWhere('s.articuloId = :articuloId', {
          articuloId: filters.articuloId,
        });
      }
      return qb.getMany();
    }
    if (!user.almacenId) {
      throw new ForbiddenException('User is not assigned to a warehouse');
    }
    qb.andWhere('s.almacenId = :almacenId', { almacenId: user.almacenId });
    if (filters?.articuloId) {
      qb.andWhere('s.articuloId = :articuloId', {
        articuloId: filters.articuloId,
      });
    }
    return qb.getMany();
  }

  async findOneForUser(id: string, user: User): Promise<ArticuloSerie> {
    const row = await this.serieRepository.findOne({
      where: { id },
      relations: { articulo: true, almacen: true },
    });
    if (!row) {
      throw new NotFoundException('Serial record not found');
    }
    assertAlmacenAccess(user, row.almacenId);
    return row;
  }

  async update(
    id: string,
    dto: UpdateArticuloSerieDto,
    user: User,
  ): Promise<ArticuloSerie> {
    const row = await this.findOneForUser(id, user);
    if (dto.almacenId !== undefined && dto.almacenId !== row.almacenId) {
      assertAlmacenAccess(user, dto.almacenId);
      row.almacenId = dto.almacenId;
    }
    if (dto.estado !== undefined) {
      row.estado = dto.estado;
    }
    return this.serieRepository.save(row);
  }
}
