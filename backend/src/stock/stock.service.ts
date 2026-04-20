import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { Stock } from './entities/stock.entity';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
  ) {}

  async findAllForUser(user: User, almacenId?: string): Promise<Stock[]> {
    const qb = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.articulo', 'articulo')
      .orderBy('articulo.codigoInterno', 'ASC');

    if (user.role === UserRole.ADMIN) {
      if (almacenId) {
        qb.andWhere('stock.almacenId = :almacenId', { almacenId });
      }
      return qb.getMany();
    }
    if (!user.almacenId) {
      throw new ForbiddenException('User is not assigned to a warehouse');
    }
    qb.andWhere('stock.almacenId = :almacenId', {
      almacenId: user.almacenId,
    });
    return qb.getMany();
  }
}
