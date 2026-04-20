import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { UserRole } from '@/types/auth';
import { getApiErrorMessage } from '@/utils/apiError';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  almacenId: string | null;
}

interface AlmacenOption {
  id: string;
  name: string;
}

interface UserFormState {
  id: string | null;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  almacenId: string;
}

const emptyForm = (): UserFormState => ({
  id: null,
  name: '',
  email: '',
  password: '',
  role: 'user',
  almacenId: '',
});

export function UsuariosPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [almacenes, setAlmacenes] = useState<AlmacenOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRows = useCallback(async () => {
    const { data } = await api.get<UserRow[]>('/api/users');
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
        await Promise.all([loadRows(), loadAlmacenes()]);
      } catch {
        if (!cancelled) setErr('No se pudieron cargar los datos (solo administradores).');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRows, loadAlmacenes]);

  const openCreate = () => {
    setDialogMode('create');
    setForm(emptyForm());
    setSubmitErr(null);
    setDialogOpen(true);
  };

  const openEdit = (row: UserRow) => {
    setDialogMode('edit');
    setForm({
      id: row.id,
      name: row.name,
      email: row.email,
      password: '',
      role: row.role,
      almacenId: row.almacenId ?? '',
    });
    setSubmitErr(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (!submitting) setDialogOpen(false);
  };

  const needsAlmacen = form.role !== 'admin';

  const handleCreate = async () => {
    setSubmitErr(null);
    if (needsAlmacen && !form.almacenId) {
      setSubmitErr('Selecciona un almacén para usuarios que no son administrador.');
      return;
    }
    if (form.password.length < 8) {
      setSubmitErr('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post<UserRow>('/api/users', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        ...(form.role === 'admin' ? {} : { almacenId: form.almacenId }),
      });
      setDialogOpen(false);
      setForm(emptyForm());
      await loadRows();
    } catch (e) {
      setSubmitErr(getApiErrorMessage(e, 'No se pudo crear el usuario.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!form.id) return;
    setSubmitErr(null);
    if (needsAlmacen && !form.almacenId) {
      setSubmitErr('Selecciona un almacén para usuarios que no son administrador.');
      return;
    }
    const pwd = form.password.trim();
    if (pwd.length > 0 && pwd.length < 8) {
      setSubmitErr('La nueva contraseña debe tener al menos 8 caracteres (o déjala vacía).');
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
      };
      if (form.role !== 'admin') {
        body.almacenId = form.almacenId;
      } else {
        body.almacenId = null;
      }
      if (pwd.length >= 8) {
        body.newPassword = pwd;
      }
      await api.patch<UserRow>(`/api/users/${form.id}`, body);
      setDialogOpen(false);
      setForm(emptyForm());
      await loadRows();
    } catch (e) {
      setSubmitErr(getApiErrorMessage(e, 'No se pudo actualizar el usuario.'));
    } finally {
      setSubmitting(false);
    }
  };

  const createValid =
    form.name.trim().length >= 2 &&
    form.email.includes('@') &&
    form.password.length >= 8 &&
    (!needsAlmacen || !!form.almacenId);

  const editValid =
    form.name.trim().length >= 2 &&
    form.email.includes('@') &&
    (!needsAlmacen || !!form.almacenId) &&
    (form.password.trim() === '' || form.password.trim().length >= 8);

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
          Usuarios
        </Typography>
        <Button startIcon={<AddIcon />} onClick={openCreate}>
          Nuevo usuario
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Como administrador puedes editar a otros usuarios (nombre, correo, rol, almacén y contraseña
        nueva). Para cambiar <strong>tu propia</strong> cuenta usa <strong>Mi cuenta</strong> en el
        menú.
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
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Almacén</TableCell>
              <TableCell align="right" width={72}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>
                  <Chip label={r.role} size="small" />
                </TableCell>
                <TableCell>{r.almacenId ?? '—'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar usuario">
                    <IconButton size="small" onClick={() => openEdit(r)} aria-label="Editar">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{dialogMode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}</DialogTitle>
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
            label="Email"
            type="email"
            fullWidth
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextField
            margin="dense"
            label={dialogMode === 'create' ? 'Contraseña inicial' : 'Nueva contraseña (opcional)'}
            type="password"
            fullWidth
            required={dialogMode === 'create'}
            helperText={
              dialogMode === 'edit'
                ? 'Deja vacío para no cambiar la contraseña'
                : 'Mínimo 8 caracteres'
            }
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="user-role-label">Rol</InputLabel>
            <Select
              labelId="user-role-label"
              label="Rol"
              value={form.role}
              onChange={(e: SelectChangeEvent<UserRole>) => {
                const role = e.target.value as UserRole;
                setForm((f) => ({
                  ...f,
                  role,
                  almacenId: role === 'admin' ? '' : f.almacenId,
                }));
              }}
            >
              <MenuItem value="admin">Administrador</MenuItem>
              <MenuItem value="almacen">Almacén</MenuItem>
              <MenuItem value="user">Usuario (pedidos / consulta)</MenuItem>
            </Select>
          </FormControl>
          {needsAlmacen && (
            <FormControl fullWidth margin="dense" required>
              <InputLabel id="user-almacen-label">Almacén</InputLabel>
              <Select
                labelId="user-almacen-label"
                label="Almacén"
                value={form.almacenId}
                onChange={(e) => setForm((f) => ({ ...f, almacenId: e.target.value }))}
              >
                {almacenes.length === 0 ? (
                  <MenuItem value="" disabled>
                    No hay almacenes — créalos primero
                  </MenuItem>
                ) : (
                  almacenes.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={submitting}>
            Cancelar
          </Button>
          {dialogMode === 'create' ? (
            <Button onClick={() => void handleCreate()} disabled={submitting || !createValid}>
              {submitting ? 'Guardando…' : 'Crear'}
            </Button>
          ) : (
            <Button onClick={() => void handleUpdate()} disabled={submitting || !editValid}>
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
