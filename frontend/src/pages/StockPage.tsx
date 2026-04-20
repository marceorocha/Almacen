import {
  Alert,
  Box,
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
import { formatQuantityDisplay } from '@/utils/formatQuantity';

interface StockRow {
  id: string;
  cantidad: string;
  reservado: string;
  almacenId: string;
  articulo?: { codigoInterno: string; descripcion: string };
}

export function StockPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<StockRow[]>('/api/stock');
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setErr('No se pudo cargar el stock.');
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
        Stock
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Artículo</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right">Reservado</TableCell>
              <TableCell>Almacén ID</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>
                  {r.articulo?.codigoInterno ?? '—'} — {r.articulo?.descripcion ?? ''}
                </TableCell>
                <TableCell align="right">{formatQuantityDisplay(r.cantidad)}</TableCell>
                <TableCell align="right">{formatQuantityDisplay(r.reservado)}</TableCell>
                <TableCell>{r.almacenId}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
