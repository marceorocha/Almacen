import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { Stock } from '../stock/entities/stock.entity';
import { User } from '../users/entities/user.entity';
import type {
  PurchaseSuggestion,
  StockAlertItem,
  StockAlertsResponse,
} from './interfaces/stock-alert-response.interface';

/** Extra units above minimum to suggest (avoids reordering at the threshold). */
const SUGGESTION_BUFFER = 1;

@Injectable()
export class AlertasService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
  ) {}

  async getStockAlerts(user: User): Promise<StockAlertsResponse> {
    const qb = this.stockRepository
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.articulo', 'a')
      .innerJoinAndSelect('s.almacen', 'al')
      .orderBy('al.name', 'ASC')
      .addOrderBy('a.codigoInterno', 'ASC');

    if (user.role !== UserRole.ADMIN) {
      if (!user.almacenId) {
        throw new ForbiddenException('User is not assigned to a warehouse');
      }
      qb.andWhere('s.almacenId = :almacenId', { almacenId: user.almacenId });
    }

    const rows = await qb.getMany();
    const items: StockAlertItem[] = [];
    const sugerenciasCompra: PurchaseSuggestion[] = [];

    for (const row of rows) {
      const articulo = row.articulo;
      const almacen = row.almacen;
      const cantidad = Number(row.cantidad);
      const reservado = Number(row.reservado ?? 0);
      const disponible = cantidad - reservado;
      const stockMinimo = Number(articulo.stockMinimo ?? 0);

      if (!Number.isFinite(disponible) || !Number.isFinite(stockMinimo)) {
        continue;
      }
      if (disponible > stockMinimo) {
        continue;
      }

      const deficit = Math.max(0, stockMinimo - disponible);
      const unidadesSugeridas = deficit + SUGGESTION_BUFFER;
      const severidad: 'critica' | 'advertencia' =
        disponible <= 0 ? 'critica' : 'advertencia';

      const sugerenciaCompra: PurchaseSuggestion = {
        articuloId: articulo.id,
        codigoInterno: articulo.codigoInterno,
        codigoProveedor: articulo.codigoProveedor,
        almacenId: almacen.id,
        almacenName: almacen.name,
        unidadesSugeridas,
        disponibleActual: disponible,
        stockMinimo,
        motivo:
          disponible <= 0
            ? 'Sin stock disponible (cantidad cubierta por reservas o agotada).'
            : `Disponible (${disponible.toFixed(3)}) en o por debajo del mínimo (${stockMinimo.toFixed(3)}).`,
      };

      const item: StockAlertItem = {
        stockId: row.id,
        articuloId: articulo.id,
        codigoInterno: articulo.codigoInterno,
        descripcion: articulo.descripcion,
        categoria: articulo.categoria,
        almacenId: almacen.id,
        almacenName: almacen.name,
        cantidad,
        reservado,
        disponible,
        stockMinimo,
        alerta: true,
        severidad,
        sugerenciaCompra,
      };
      items.push(item);
      sugerenciasCompra.push(sugerenciaCompra);
    }

    return {
      generadoEn: new Date().toISOString(),
      totalAlertas: items.length,
      items,
      sugerenciasCompra,
    };
  }
}
