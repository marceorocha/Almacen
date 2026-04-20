import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { getApiErrorMessage } from '@/utils/apiError';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = useMemo(() => params.get('token')?.trim() ?? '', [params]);

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tokenFromUrl) {
      setError('Enlace inválido: falta el token. Solicita un nuevo correo de recuperación.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post<{ message: string }>('/api/auth/reset-password', {
        token: tokenFromUrl,
        newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo restablecer la contraseña.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{ bgcolor: 'background.default', px: 2, py: 4 }}
    >
      <Container maxWidth="sm">
        <Card elevation={2}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Nueva contraseña
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Elige una contraseña segura. Serás redirigido al inicio de sesión cuando termine.
            </Typography>
            {success ? (
              <Alert severity="success">
                Contraseña actualizada. Redirigiendo al inicio de sesión…
              </Alert>
            ) : (
              <Box component="form" onSubmit={handleSubmit}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                {!tokenFromUrl && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Abre el enlace que recibiste por correo (debe incluir ?token=… en la URL).
                  </Alert>
                )}
                <TextField
                  label="Nueva contraseña"
                  type="password"
                  fullWidth
                  required
                  margin="normal"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <TextField
                  label="Confirmar contraseña"
                  type="password"
                  fullWidth
                  required
                  margin="normal"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <Button type="submit" fullWidth size="large" sx={{ mt: 3 }} disabled={submitting}>
                  {submitting ? 'Guardando…' : 'Guardar contraseña'}
                </Button>
              </Box>
            )}
            <Box sx={{ mt: 3 }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Ir al inicio de sesión
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
