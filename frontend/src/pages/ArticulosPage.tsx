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

interface Articulo {
  id: string;
  codigoInterno: string;
  codigoProveedor: string | null;
  descripcion: string;
  tipo: string;
  categoria: string;
  stockMinimo: string;
}

export function ArticulosPage() {
  const [rows, setRows] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<Articulo[]>('/api/articulos');
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setErr('No se pudieron cargar los artículos.');
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
        Artículos
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
              <TableCell>Código</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell align="right">Stock mín.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.codigoInterno}</TableCell>
                <TableCell>{r.descripcion}</TableCell>
                <TableCell>{r.tipo}</TableCell>
                <TableCell>{r.categoria}</TableCell>
                <TableCell align="right">{r.stockMinimo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
