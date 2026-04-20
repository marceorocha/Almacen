import { Controller, Get, ParseUUIDPipe, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Stock } from './entities/stock.entity';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('almacenId', new ParseUUIDPipe({ optional: true }))
    almacenId?: string,
  ): Promise<Stock[]> {
    return this.stockService.findAllForUser(user, almacenId);
  }
}
