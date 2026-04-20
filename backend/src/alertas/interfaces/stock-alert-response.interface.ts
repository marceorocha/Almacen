export interface PurchaseSuggestion {
  articuloId: string;
  codigoInterno: string;
  codigoProveedor: string | null;
  almacenId: string;
  almacenName: string;
  /** Units suggested to order (covers deficit + small buffer). */
  unidadesSugeridas: number;
  /** Current available (cantidad − reservado). */
  disponibleActual: number;
  stockMinimo: number;
  motivo: string;
}

export interface StockAlertItem {
  stockId: string;
  articuloId: string;
  codigoInterno: string;
  descripcion: string;
  categoria: string;
  almacenId: string;
  almacenName: string;
  cantidad: number;
  reservado: number;
  disponible: number;
  stockMinimo: number;
  alerta: true;
  severidad: 'critica' | 'advertencia';
  /** Same row, structured for restock / purchasing. */
  sugerenciaCompra: PurchaseSuggestion;
}

export interface StockAlertsResponse {
  generadoEn: string;
  totalAlertas: number;
  /** Rows at or below minimum (disponible ≤ stockMinimo). */
  items: StockAlertItem[];
  /** Flat list for procurement (same as items[].sugerenciaCompra). */
  sugerenciasCompra: PurchaseSuggestion[];
}
