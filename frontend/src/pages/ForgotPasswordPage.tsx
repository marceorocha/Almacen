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
import { useState, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '@/api/client';
import { getApiErrorMessage } from '@/utils/apiError';

interface ForgotResponse {
  message: string;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post<ForgotResponse>('/api/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo procesar la solicitud.'));
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
              Recuperar contraseña
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Indica el correo de tu cuenta. Si existe, recibirás un enlace para crear una nueva
              contraseña (revisa también la consola del servidor en desarrollo con MAIL_LOG_ONLY).
            </Typography>
            {done ? (
              <Alert severity="info">
                Si el correo existe en el sistema, recibirás instrucciones para restablecer la
                contraseña.
              </Alert>
            ) : (
              <Box component="form" onSubmit={handleSubmit}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  label="Correo"
                  type="email"
                  fullWidth
                  required
                  margin="normal"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" fullWidth size="large" sx={{ mt: 3 }} disabled={submitting}>
                  {submitting ? 'Enviando…' : 'Enviar enlace'}
                </Button>
              </Box>
            )}
            <Box sx={{ mt: 3 }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Volver al inicio de sesión
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
