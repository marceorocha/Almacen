import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser } from '@/types/auth';
import { getApiErrorMessage } from '@/utils/apiError';

interface ProfileForm {
  name: string;
  email: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<ProfileForm>({ name: '', email: '' });
  const [pwd, setPwd] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const loadMe = useCallback(async () => {
    const { data } = await api.get<AuthUser>('/api/users/me');
    setProfile({ name: data.name, email: data.email });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadMe();
      } catch {
        if (!cancelled) setProfileMsg({ type: 'error', text: 'No se pudo cargar el perfil.' });
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe]);

  const handleSaveProfile = async () => {
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      await api.patch<AuthUser>('/api/users/me', {
        name: profile.name.trim(),
        email: profile.email.trim().toLowerCase(),
      });
      await refreshProfile();
      await loadMe();
      setProfileMsg({ type: 'success', text: 'Datos actualizados.' });
    } catch (e) {
      setProfileMsg({ type: 'error', text: getApiErrorMessage(e, 'No se pudieron guardar los datos.') });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdMsg(null);
    if (pwd.newPassword !== pwd.confirmPassword) {
      setPwdMsg({ type: 'error', text: 'La nueva contraseña y la confirmación no coinciden.' });
      return;
    }
    if (pwd.newPassword.length < 8) {
      setPwdMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    setSavingPwd(true);
    try {
      await api.patch('/api/users/me/password', {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setPwd({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPwdMsg({ type: 'success', text: 'Contraseña actualizada.' });
    } catch (e) {
      setPwdMsg({
        type: 'error',
        text: getApiErrorMessage(e, 'No se pudo cambiar la contraseña.'),
      });
    } finally {
      setSavingPwd(false);
    }
  };

  if (loadingProfile) {
    return <Typography>Cargando…</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Mi cuenta
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Rol: <strong>{user?.role}</strong>
        {user?.almacenId ? (
          <>
            {' '}
            · Almacén: <strong>{user.almacenId}</strong>
          </>
        ) : null}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Datos personales
          </Typography>
          {profileMsg && (
            <Alert severity={profileMsg.type} sx={{ mb: 2 }}>
              {profileMsg.text}
            </Alert>
          )}
          <TextField
            label="Nombre"
            fullWidth
            margin="normal"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
          />
          <TextField
            label="Correo"
            type="email"
            fullWidth
            margin="normal"
            value={profile.email}
            onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
          />
          <Button sx={{ mt: 2 }} onClick={() => void handleSaveProfile()} disabled={savingProfile}>
            {savingProfile ? 'Guardando…' : 'Guardar datos'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cambiar contraseña
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Debes indicar tu contraseña actual.
          </Typography>
          {pwdMsg && (
            <Alert severity={pwdMsg.type} sx={{ mb: 2 }}>
              {pwdMsg.text}
            </Alert>
          )}
          <TextField
            label="Contraseña actual"
            type="password"
            fullWidth
            margin="dense"
            value={pwd.currentPassword}
            onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))}
          />
          <Divider sx={{ my: 2 }} />
          <TextField
            label="Nueva contraseña"
            type="password"
            fullWidth
            margin="dense"
            helperText="Mínimo 8 caracteres"
            value={pwd.newPassword}
            onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
          />
          <TextField
            label="Confirmar nueva contraseña"
            type="password"
            fullWidth
            margin="dense"
            value={pwd.confirmPassword}
            onChange={(e) => setPwd((p) => ({ ...p, confirmPassword: e.target.value }))}
          />
          <Button sx={{ mt: 2 }} onClick={() => void handleChangePassword()} disabled={savingPwd}>
            {savingPwd ? 'Actualizando…' : 'Actualizar contraseña'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
