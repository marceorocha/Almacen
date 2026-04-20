import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
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
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatQuantityDisplay } from '@/utils/formatQuantity';

type ArticuloTipo = 'trazable' | 'no_trazable';

interface Articulo {
  id: string;
  codigoInterno: string;
  codigoProveedor: string | null;
  descripcion: string;
  tipo: ArticuloTipo;
  categoria: string;
  stockMinimo: string;
}

interface AlmacenOption {
  id: string;
  name: string;
}

interface CreateArticuloForm {
  codigoInterno: string;
  codigoProveedor: string;
  descripcion: string;
  tipo: ArticuloTipo;
  categoria: string;
  stockMinimo: string;
  almacenInicialId: string;
  cantidadInicial: string;
  numeroSerieInicial: string;
}

function emptyForm(almacenDefault = ''): CreateArticuloForm {
  return {
    codigoInterno: '',
    codigoProveedor: '',
    descripcion: '',
    tipo: 'no_trazable',
    categoria: '',
    stockMinimo: '0',
    almacenInicialId: almacenDefault,
    cantidadInicial: '0',
    numeroSerieInicial: '',
  };
}

export function ArticulosPage() {
  const { user } = useAuth();
  const canCreate = user?.role === 'admin' || user?.role === 'almacen';

  const [rows, setRows] = useState<Articulo[]>([]);
  const [almacenes, setAlmacenes] = useState<AlmacenOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateArticuloForm>(emptyForm());
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRows = useCallback(async () => {
    const { data } = await api.get<Articulo[]>('/api/articulos');
    setRows(data);
  }, []);

  const loadAlmacenes = useCallback(async () => {
    const { data } = await api.get<AlmacenOption[]>('/api/almacenes');
    setAlmacenes(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadRows();
        if (canCreate) {
          await loadAlmacenes();
        }
      } catch {
        if (!cancelled) setErr('No se pudieron cargar los artículos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRows, loadAlmacenes, canCreate]);

  const openCreate = () => {
    const defaultAlmacen = user?.role === 'almacen' && user.almacenId ? user.almacenId : '';
    setForm(emptyForm(defaultAlmacen));
    setSubmitErr(null);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    setSubmitErr(null);
    setSubmitting(true);
    try {
      const codigoProveedor = form.codigoProveedor.trim();
      const body: Record<string, unknown> = {
        codigoInterno: form.codigoInterno.trim(),
        descripcion: form.descripcion.trim(),
        tipo: form.tipo,
        categoria: form.categoria.trim(),
        stockMinimo: form.stockMinimo.trim() || '0',
        almacenInicialId: form.almacenInicialId,
        cantidadInicial: form.cantidadInicial.trim() || '0',
      };
      if (codigoProveedor) {
        body.codigoProveedor = codigoProveedor;
      }
      if (form.tipo === 'trazable' && Number(form.cantidadInicial) === 1) {
        body.numeroSerieInicial = form.numeroSerieInicial.trim();
      }
      await api.post<Articulo>('/api/articulos', body);
      setDialogOpen(false);
      setForm(emptyForm());
      await loadRows();
    } catch (e) {
      setSubmitErr(getApiErrorMessage(e, 'No se pudo crear el artículo.'));
    } finally {
      setSubmitting(false);
    }
  };

  const qtyNum = Number(form.cantidadInicial);
  const trazableNeedsSerie = form.tipo === 'trazable' && qtyNum === 1;

  const baseValid =
    form.codigoInterno.trim().length >= 1 &&
    form.descripcion.trim().length >= 1 &&
    form.categoria.trim().length >= 1 &&
    !!form.almacenInicialId &&
    form.cantidadInicial.trim() !== '' &&
    Number.isFinite(qtyNum) &&
    qtyNum >= 0;

  const trazableValid =
    form.tipo !== 'trazable' ||
    ((qtyNum === 0 || qtyNum === 1) &&
      (qtyNum === 0 || form.numeroSerieInicial.trim().length >= 1));

  const formValid = baseValid && trazableValid;

  const explainStock =
    'El artículo queda en Stock en el almacén elegido. Con cantidad 0 solo aparece la fila en Stock. Con cantidad mayor a 0 se genera un movimiento de entrada ya recibido. Para mover entre almacenes usa una transferencia.';

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        flexWrap="wrap"
        justifyContent="space-between"
        alignItems="center"
        gap={2}
        mb={2}
      >
        <Typography variant="h4" fontWeight={700}>
          Artículos
        </Typography>
        {canCreate && (
          <Button startIcon={<AddIcon />} onClick={openCreate}>
            Nuevo artículo
          </Button>
        )}
      </Box>
      {!canCreate && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Solo administradores o personal de almacén pueden dar de alta artículos con stock inicial.
        </Typography>
      )}
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
                <TableCell align="right">{formatQuantityDisplay(r.stockMinimo)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => !submitting && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nuevo artículo</DialogTitle>
        <DialogContent>
          {submitErr && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitErr}
            </Alert>
          )}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">{explainStock}</Typography>
          </Alert>
          <FormControl fullWidth margin="dense" required>
            <InputLabel id="articulo-almacen-label">Almacén inicial</InputLabel>
            <Select
              labelId="articulo-almacen-label"
              label="Almacén inicial"
              value={form.almacenInicialId}
              disabled={user?.role === 'almacen'}
              onChange={(e) => setForm((f) => ({ ...f, almacenInicialId: e.target.value }))}
            >
              {almacenes.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            autoFocus
            margin="dense"
            label="Código interno"
            fullWidth
            required
            value={form.codigoInterno}
            onChange={(e) => setForm((f) => ({ ...f, codigoInterno: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Código proveedor (opcional)"
            fullWidth
            value={form.codigoProveedor}
            onChange={(e) => setForm((f) => ({ ...f, codigoProveedor: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Descripción"
            fullWidth
            required
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="articulo-tipo-label">Tipo</InputLabel>
            <Select
              labelId="articulo-tipo-label"
              label="Tipo"
              value={form.tipo}
              onChange={(e: SelectChangeEvent<ArticuloTipo>) => {
                const tipo = e.target.value as ArticuloTipo;
                setForm((f) => ({
                  ...f,
                  tipo,
                  cantidadInicial: tipo === 'trazable' ? '0' : f.cantidadInicial,
                  numeroSerieInicial: tipo === 'trazable' ? f.numeroSerieInicial : '',
                }));
              }}
            >
              <MenuItem value="no_trazable">No trazable (por cantidad)</MenuItem>
              <MenuItem value="trazable">Trazable (por número de serie)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Cantidad inicial en ese almacén"
            fullWidth
            required
            helperText={
              form.tipo === 'trazable'
                ? 'Solo 0 (sin unidad aún) o 1 (una unidad con número de serie nuevo).'
                : 'Si es mayor que 0, se registra un movimiento de entrada recibido.'
            }
            value={form.cantidadInicial}
            onChange={(e) => setForm((f) => ({ ...f, cantidadInicial: e.target.value }))}
          />
          {trazableNeedsSerie && (
            <TextField
              margin="dense"
              label="Número de serie (unidad nueva)"
              fullWidth
              required
              value={form.numeroSerieInicial}
              onChange={(e) => setForm((f) => ({ ...f, numeroSerieInicial: e.target.value }))}
            />
          )}
          <TextField
            margin="dense"
            label="Categoría"
            fullWidth
            required
            value={form.categoria}
            onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Stock mínimo"
            fullWidth
            helperText="Alertas de reposición (catálogo)"
            value={form.stockMinimo}
            onChange={(e) => setForm((f) => ({ ...f, stockMinimo: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleCreate()} disabled={submitting || !formValid}>
            {submitting ? 'Guardando…' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
