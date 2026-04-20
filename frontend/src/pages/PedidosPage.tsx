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

interface PedidoDetalle {
  id: string;
  articuloId: string;
  cantidad: string;
}

interface Pedido {
  id: string;
  estado: string;
  fecha: string;
  usuarioId: string;
  usuario?: { name: string; email: string };
  detalles?: PedidoDetalle[];
  movimientoReservaId?: string | null;
}

export function PedidosPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<Pedido[]>('/api/pedidos');
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setErr('No se pudieron cargar los pedidos.');
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
        Pedidos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {user?.role === 'user'
          ? 'Puedes crear pedidos desde la API (POST /api/pedidos) o ampliar esta pantalla con formulario.'
          : 'Aprueba o rechaza pedidos pendientes vía API (PATCH …/aprobar o …/rechazar).'}
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
              <TableCell>Estado</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Solicitante</TableCell>
              <TableCell align="right">Líneas</TableCell>
              <TableCell>Reserva mov.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>
                  <Chip label={r.estado} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell>{new Date(r.fecha).toLocaleString()}</TableCell>
                <TableCell>{r.usuario?.name ?? r.usuarioId}</TableCell>
                <TableCell align="right">{r.detalles?.length ?? 0}</TableCell>
                <TableCell>{r.movimientoReservaId ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
