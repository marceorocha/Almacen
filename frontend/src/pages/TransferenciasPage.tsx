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
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/api/client';

interface Movimiento {
  id: string;
  tipo: string;
  estado: string;
  fecha: string;
  almacenOrigenId: string | null;
  almacenDestinoId: string | null;
}

export function TransferenciasPage() {
  const [rows, setRows] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<Movimiento[]>('/api/movimientos');
        if (!cancelled) setRows(data.filter((m) => m.tipo === 'transferencia'));
      } catch {
        if (!cancelled) setErr('No se pudieron cargar las transferencias.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows.length]);

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
        Transferencias
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Movimientos con tipo <strong>transferencia</strong> entre almacenes.
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      {empty && !err && <Alert severity="info">No hay transferencias registradas.</Alert>}
      {!empty && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Estado</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Origen</TableCell>
                <TableCell>Destino</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Chip label={r.estado} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{new Date(r.fecha).toLocaleString()}</TableCell>
                  <TableCell>{r.almacenOrigenId ?? '—'}</TableCell>
                  <TableCell>{r.almacenDestinoId ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
