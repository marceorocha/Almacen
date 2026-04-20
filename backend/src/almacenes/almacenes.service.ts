import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { assertAlmacenAccess } from '../common/utils/almacen-scope.util';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { UpdateAlmacenDto } from './dto/update-almacen.dto';
import { Almacen } from './entities/almacen.entity';

@Injectable()
export class AlmacenesService {
  constructor(
    @InjectRepository(Almacen)
    private readonly almacenesRepository: Repository<Almacen>,
  ) {}

  async create(dto: CreateAlmacenDto): Promise<Almacen> {
    const almacen = this.almacenesRepository.create(dto);
    return this.almacenesRepository.save(almacen);
  }

  async findAllForUser(user: User): Promise<Almacen[]> {
    if (user.role === UserRole.ADMIN) {
      return this.almacenesRepository.find({ order: { name: 'ASC' } });
    }
    if (!user.almacenId) {
      throw new ForbiddenException('User is not assigned to a warehouse');
    }
    const row = await this.almacenesRepository.findOne({
      where: { id: user.almacenId },
    });
    return row ? [row] : [];
  }

  async findOneForUser(id: string, user: User): Promise<Almacen> {
    assertAlmacenAccess(user, id);
    const almacen = await this.almacenesRepository.findOne({ where: { id } });
    if (!almacen) {
      throw new NotFoundException('Warehouse not found');
    }
    return almacen;
  }

  async update(id: string, dto: UpdateAlmacenDto): Promise<Almacen> {
    const almacen = await this.almacenesRepository.findOne({ where: { id } });
    if (!almacen) {
      throw new NotFoundException('Warehouse not found');
    }
    Object.assign(almacen, dto);
    return this.almacenesRepository.save(almacen);
  }

  async remove(id: string): Promise<void> {
    const res = await this.almacenesRepository.delete(id);
    if (!res.affected) {
      throw new NotFoundException('Warehouse not found');
    }
  }
}
