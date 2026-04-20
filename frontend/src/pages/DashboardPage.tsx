import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Panel
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Hola, {user?.name}. Usa el menú para gestionar inventario según tu rol.
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Rol
          </Typography>
          <Chip label={user?.role ?? '—'} color="primary" sx={{ mt: 1 }} />
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Almacén asignado
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            {user?.almacenId ? user.almacenId : '— (admin u otro)'}
          </Typography>
        </Paper>
      </Stack>
    </Box>
  );
}
