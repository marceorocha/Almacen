/**
 * Muestra cantidades guardadas como decimal sin ceros decimales innecesarios (ej. 1 en lugar de 1.000).
 */
export function formatQuantityDisplay(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) {
    return String(value);
  }
  return parseFloat(n.toFixed(8)).toString();
}
