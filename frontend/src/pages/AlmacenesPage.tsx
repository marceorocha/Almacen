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
  Paper,
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

interface Almacen {
  id: string;
  name: string;
  location: string;
}

interface CreateAlmacenForm {
  name: string;
  location: string;
}

const emptyForm: CreateAlmacenForm = { name: '', location: '' };

export function AlmacenesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [rows, setRows] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateAlmacenForm>(emptyForm);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRows = useCallback(async () => {
    const { data } = await api.get<Almacen[]>('/api/almacenes');
    setRows(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadRows();
      } catch {
        if (!cancelled) setErr('No se pudieron cargar los almacenes.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRows]);

  const openCreate = () => {
    setForm(emptyForm);
    setSubmitErr(null);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    setSubmitErr(null);
    setSubmitting(true);
    try {
      await api.post<Almacen>('/api/almacenes', {
        name: form.name.trim(),
        location: form.location.trim(),
      });
      setDialogOpen(false);
      setForm(emptyForm);
      await loadRows();
    } catch (e) {
      setSubmitErr(getApiErrorMessage(e, 'No se pudo crear el almacén.'));
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
      <Box
        display="flex"
        flexWrap="wrap"
        justifyContent="space-between"
        alignItems="center"
        gap={2}
        mb={2}
      >
        <Typography variant="h4" fontWeight={700}>
          Almacenes
        </Typography>
        {isAdmin && (
          <Button startIcon={<AddIcon />} onClick={openCreate}>
            Nuevo almacén
          </Button>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Los usuarios de rol <strong>almacén</strong> deben estar vinculados a un almacén. Solo
        administradores pueden dar de alta almacenes nuevos.
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
              <TableCell>Nombre</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell width="36%">Id</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.location}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => !submitting && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nuevo almacén</DialogTitle>
        <DialogContent>
          {submitErr && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitErr}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Nombre"
            fullWidth
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Ubicación"
            fullWidth
            required
            multiline
            minRows={2}
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleCreate()}
            disabled={submitting || form.name.trim().length < 2 || form.location.trim().length < 2}
          >
            {submitting ? 'Guardando…' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
