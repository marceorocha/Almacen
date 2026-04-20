export enum ArticuloSerieEstado {
  DISPONIBLE = 'disponible',
  RESERVADO = 'reservado',
  EN_TRANSITO = 'en_transito',
  /** Left the warehouse (completed outbound). */
  ENTREGADO = 'entregado',
}
