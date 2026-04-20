import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateArticuloDto } from './dto/create-articulo.dto';
import { UpdateArticuloDto } from './dto/update-articulo.dto';
import { Articulo } from './entities/articulo.entity';

@Injectable()
export class ArticulosService {
  constructor(
    @InjectRepository(Articulo)
    private readonly articulosRepository: Repository<Articulo>,
  ) {}

  async create(dto: CreateArticuloDto): Promise<Articulo> {
    const articulo = this.articulosRepository.create({
      ...dto,
      stockMinimo: dto.stockMinimo ?? '0',
    });
    return this.articulosRepository.save(articulo);
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
