import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AlertasService } from './alertas.service';
import type { StockAlertsResponse } from './interfaces/stock-alert-response.interface';

@Controller('alertas')
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Get()
  getStockAlerts(@CurrentUser() user: User): Promise<StockAlertsResponse> {
    return this.alertasService.getStockAlerts(user);
  }
}
