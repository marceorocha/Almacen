import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatQuantityDisplay } from '@/utils/formatQuantity';

type ArticuloTipo = 'trazable' | 'no_trazable';

interface Articulo {
  id: string;
  codigoInterno: string;
  descripcion: string;
  tipo: ArticuloTipo;
  categoria: string;
}

interface AlmacenOption {
  id: string;
  name: string;
}

interface LineaIngreso {
  articuloId: string;
  etiqueta: string;
  cantidad: string;
}

const filterArticulos = createFilterOptions<Articulo>({
  stringify: (a) => `${a.codigoInterno} ${a.descripcion} ${a.categoria}`,
});

function mergeDetalles(lines: LineaIngreso[]): { articuloId: string; cantidad: string }[] {
  const map = new Map<string, number>();
  for (const l of lines) {
    const q = Number(l.cantidad);
    if (!Number.isFinite(q) || q <= 0) continue;
    map.set(l.articuloId, (map.get(l.articuloId) ?? 0) + q);
  }
  return [...map.entries()].map(([articuloId, sum]) => ({
    articuloId,
    cantidad: Number.isInteger(sum) ? String(sum) : parseFloat(sum.toFixed(6)).toString(),
  }));
}

export function IngresoMercaderiaPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [almacenes, setAlmacenes] = useState<AlmacenOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [almacenId, setAlmacenId] = useState('');
  const [selected, setSelected] = useState<Articulo | null>(null);
  const [cantidadInput, setCantidadInput] = useState('1');
  const [lines, setLines] = useState<LineaIngreso[]>([]);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const articulosNoTrazables = useMemo(
    () => articulos.filter((a) => a.tipo === 'no_trazable'),
    [articulos],
  );

  const loadData = useCallback(async () => {
    const [artRes, almRes] = await Promise.all([
      api.get<Articulo[]>('/api/articulos'),
      api.get<AlmacenOption[]>('/api/almacenes'),
    ]);
    setArticulos(artRes.data);
    setAlmacenes(almRes.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadData();
        if (!cancelled && user?.role === 'almacen' && user.almacenId) {
          setAlmacenId(user.almacenId);
        }
      } catch {
        if (!cancelled) setErr('No se pudieron cargar artículos o almacenes.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadData, user?.role, user?.almacenId]);

  const agregarLinea = () => {
    setSubmitErr(null);
    setSuccess(null);
    if (!selected) {
      setSubmitErr('Elegí un artículo de la lista.');
      return;
    }
    const q = Number(cantidadInput);
    if (!Number.isFinite(q) || q <= 0) {
      setSubmitErr('La cantidad debe ser un número mayor a 0.');
      return;
    }
    const etiqueta = `${selected.codigoInterno} — ${selected.descripcion}`;
    setLines((prev) => {
      const next = [...prev];
      const idx = next.findIndex((l) => l.articuloId === selected.id);
      const cantStr = Number.isInteger(q) ? String(q) : parseFloat(q.toFixed(6)).toString();
      if (idx >= 0) {
        const sum = Number(next[idx].cantidad) + q;
        next[idx] = {
          ...next[idx],
          cantidad: Number.isInteger(sum) ? String(sum) : parseFloat(sum.toFixed(6)).toString(),
        };
        return next;
      }
      next.push({
        articuloId: selected.id,
        etiqueta,
        cantidad: cantStr,
      });
      return next;
    });
    setCantidadInput('1');
  };

  const registrarIngreso = async () => {
    setSubmitErr(null);
    setSuccess(null);
    if (!almacenId) {
      setSubmitErr('Seleccioná el almacén de ingreso.');
      return;
    }
    const detalles = mergeDetalles(lines);
    if (detalles.length === 0) {
      setSubmitErr('Agregá al menos una línea con cantidad.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/movimientos', {
        tipo: 'entrada',
        almacenDestinoId: almacenId,
        estado: 'recibido',
        detalles,
      });
      setSuccess('Ingreso registrado. El stock se actualizó y el movimiento quedó en el listado.');
      setLines([]);
      await loadData();
    } catch (e) {
      setSubmitErr(getApiErrorMessage(e, 'No se pudo registrar el ingreso.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <MoveToInboxIcon color="primary" />
        <Typography variant="h4" fontWeight={700}>
          Ingreso de mercadería
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Buscá por nombre, código o categoría. Solo artículos <strong>no trazables</strong> (por
        cantidad); los trazables van con número de serie en otro flujo.
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Almacén donde ingresa la mercadería
        </Typography>
        {isAdmin ? (
          <FormControl fullWidth margin="dense" size="small">
            <InputLabel id="ingreso-almacen">Almacén</InputLabel>
            <Select
              labelId="ingreso-almacen"
              label="Almacén"
              value={almacenId}
              onChange={(e: SelectChangeEvent<string>) => setAlmacenId(e.target.value)}
            >
              {almacenes.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Typography variant="body2">
            Almacén asignado a tu usuario:{' '}
            <strong>{almacenes.find((a) => a.id === almacenId)?.name ?? almacenId}</strong>
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Agregar líneas
        </Typography>
        {submitErr && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitErr}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}{' '}
            <Link component={RouterLink} to="/movimientos">
              Ver movimientos
            </Link>
          </Alert>
        )}
        <Autocomplete
          options={articulosNoTrazables}
          value={selected}
          onChange={(_, v) => setSelected(v)}
          getOptionLabel={(a) => `${a.codigoInterno} — ${a.descripcion}`}
          filterOptions={filterArticulos}
          renderInput={(params) => (
            <TextField {...params} label="Buscar artículo" placeholder="Escribí para filtrar…" />
          )}
          sx={{ mb: 2 }}
        />
        <Box display="flex" flexWrap="wrap" gap={2} alignItems="flex-start">
          <TextField
            label="Cantidad"
            type="number"
            size="small"
            sx={{ width: 140 }}
            inputProps={{ min: 0.001, step: 'any' }}
            value={cantidadInput}
            onChange={(e) => setCantidadInput(e.target.value)}
          />
          <Button variant="outlined" onClick={agregarLinea}>
            Añadir a la lista
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Artículo</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right" width={80}>
                Quitar
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary">
                    Todavía no hay líneas. Buscá un artículo, cantidad y «Añadir a la lista».
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              lines.map((l) => (
                <TableRow key={l.articuloId}>
                  <TableCell>{l.etiqueta}</TableCell>
                  <TableCell align="right">{formatQuantityDisplay(l.cantidad)}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="inherit"
                      startIcon={<DeleteOutlineIcon />}
                      onClick={() =>
                        setLines((prev) => prev.filter((x) => x.articuloId !== l.articuloId))
                      }
                    >
                      Quitar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        variant="contained"
        size="large"
        onClick={() => void registrarIngreso()}
        disabled={submitting || lines.length === 0 || !almacenId}
      >
        {submitting ? 'Registrando…' : 'Registrar ingreso (movimiento + stock)'}
      </Button>
    </Box>
  );
}
