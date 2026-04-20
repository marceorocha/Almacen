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
import { useAuth } from '@/context/AuthContext';

import { api } from '@/api/client';

interface Movimiento {
  id: string;
  tipo: string;
  estado: string;
  fecha: string;
  almacenOrigenId: string | null;
  almacenDestinoId: string | null;
}

export function MovimientosPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<Movimiento[]>('/api/movimientos');
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setErr('No se pudieron cargar los movimientos.');
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
        Movimientos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {user?.role === 'user'
          ? 'Vista de lectura. Altas y cambios de estado los realizan admin o almacén.'
          : 'Los cambios de estado y altas se gestionan desde la API o futuras pantallas de formulario.'}
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
              <TableCell>Tipo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Origen</TableCell>
              <TableCell>Destino</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.tipo}</TableCell>
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
    </Box>
  );
}
