import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RoleGuard } from '@/components/RoleGuard';
import { RequireAuth } from '@/components/RequireAuth';
import { AuthProvider } from '@/context/AuthContext';
import { MainLayout } from '@/layout/MainLayout';
import { AlertasPage } from '@/pages/AlertasPage';
import { AlmacenesPage } from '@/pages/AlmacenesPage';
import { ArticulosPage } from '@/pages/ArticulosPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { IngresoMercaderiaPage } from '@/pages/IngresoMercaderiaPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { MovimientosPage } from '@/pages/MovimientosPage';
import { PedidosPage } from '@/pages/PedidosPage';
import { StockPage } from '@/pages/StockPage';
import { TransferenciasPage } from '@/pages/TransferenciasPage';
import { UsuariosPage } from '@/pages/UsuariosPage';
import { appTheme } from '@/theme';

export default function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/olvido-contrasena" element={<ForgotPasswordPage />} />
            <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
            <Route
              element={
                <RequireAuth>
                  <MainLayout />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="perfil" element={<ProfilePage />} />
              <Route path="almacenes" element={<AlmacenesPage />} />
              <Route path="articulos" element={<ArticulosPage />} />
              <Route path="stock" element={<StockPage />} />
              <Route
                path="ingreso-mercaderia"
                element={
                  <RoleGuard allow={['admin', 'almacen']}>
                    <IngresoMercaderiaPage />
                  </RoleGuard>
                }
              />
              <Route path="movimientos" element={<MovimientosPage />} />
              <Route path="transferencias" element={<TransferenciasPage />} />
              <Route path="pedidos" element={<PedidosPage />} />
              <Route path="alertas" element={<AlertasPage />} />
              <Route
                path="usuarios"
                element={
                  <RoleGuard allow={['admin']}>
                    <UsuariosPage />
                  </RoleGuard>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
