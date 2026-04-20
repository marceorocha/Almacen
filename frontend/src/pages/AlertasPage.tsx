import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';

interface StockAlertItem {
  stockId: string;
  articuloId: string;
  codigoInterno: string;
  descripcion: string;
  almacenName: string;
  disponible: number;
  stockMinimo: number;
  severidad: string;
  sugerenciaCompra: { unidadesSugeridas: number; motivo: string };
}

interface AlertsResponse {
  generadoEn: string;
  totalAlertas: number;
  items: StockAlertItem[];
}

export function AlertasPage() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<AlertsResponse>('/api/alertas');
        if (!cancelled) setData(data);
      } catch {
        if (!cancelled) setErr('No se pudieron cargar las alertas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Alertas de stock
      </Typography>
      {data && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Generado: {new Date(data.generadoEn).toLocaleString()} · Total: {data.totalAlertas}
        </Typography>
      )}
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      {!err && data && data.items.length === 0 && (
        <Alert severity="success">No hay artículos por debajo del mínimo.</Alert>
      )}
      {data && data.items.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Artículo</TableCell>
                <TableCell>Almacén</TableCell>
                <TableCell align="right">Disponible</TableCell>
                <TableCell align="right">Mínimo</TableCell>
                <TableCell align="right">Sugerido</TableCell>
                <TableCell>Severidad</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((r) => (
                <TableRow key={r.stockId} hover>
                  <TableCell>
                    {r.codigoInterno}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {r.descripcion}
                    </Typography>
                  </TableCell>
                  <TableCell>{r.almacenName}</TableCell>
                  <TableCell align="right">{r.disponible.toFixed(3)}</TableCell>
                  <TableCell align="right">{r.stockMinimo.toFixed(3)}</TableCell>
                  <TableCell align="right">{r.sugerenciaCompra.unidadesSugeridas}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.severidad}
                      size="small"
                      color={r.severidad === 'critica' ? 'error' : 'warning'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
