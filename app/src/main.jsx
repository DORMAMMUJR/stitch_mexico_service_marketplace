import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HomePage } from './pages/HomePage';
import { DirectoryPage } from './pages/DirectoryPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { IntecniaProfilePage } from './pages/IntecniaProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { VerificationPage } from './pages/VerificationPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminPanel } from './pages/AdminPanel';
import { SettingsPaymentsPage } from './pages/SettingsPaymentsPage';
import { ReservationDirectPage } from './pages/ReservationDirectPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './components/ToastContext';
import { PrivateRoute } from './components/PrivateRoute';
import './style.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,  // 5 min de caché
      gcTime:    1000 * 60 * 10, // 10 min antes de limpiar caché inactivo
    },
  },
});
const googleClientId = String(import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '').trim();

function AppProviders({ children }) {
  if (!googleClientId) return children;
  return <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>;
}

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <AppProviders>
      {/* BrowserRouter va AFUERA de AuthProvider para que useNavigate
          funcione dentro del contexto de autenticación (interceptor 401) */}
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <Routes>

              {/* ── Rutas públicas ─────────────────────────────────────── */}
              <Route path="/"          element={<HomePage />} />
              <Route path="/directory" element={<DirectoryPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/terms"     element={<TermsPage />} />
              <Route path="/privacy"   element={<PrivacyPage />} />
              <Route path="/login"     element={<LoginPage />} />
              <Route path="/register"  element={<RegisterPage />} />
              <Route path="/reserva/:id" element={<ReservationDirectPage />} />

              {/* Perfil público — visible solo si isVerified (validado en backend) */}
              <Route path="/profile/:id"         element={<IntecniaProfilePage />} />
              {/* Alias legacy → redirige a la ruta canónica */}
              <Route path="/intecnia-profile"    element={<Navigate to="/directory" replace />} />
              <Route path="/intecnia-profile/:id" element={<Navigate to="/profile/:id" replace />} />

              {/* ── Rutas protegidas — PROFESSIONAL ────────────────────── */}
              <Route path="/dashboard" element={
                <PrivateRoute
                  allowedRoles={['PROFESSIONAL', 'CLIENT']}
                  requireCompleteProfile={false}
                >
                  <DashboardPage />
                </PrivateRoute>
              } />

              <Route path="/verification" element={
                <PrivateRoute allowedRoles={['PROFESSIONAL', 'CLIENT']}>
                  <VerificationPage />
                </PrivateRoute>
              } />
              <Route path="/dashboard/verification" element={
                <PrivateRoute allowedRoles={['PROFESSIONAL', 'CLIENT']}>
                  <VerificationPage />
                </PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute allowedRoles={['PROFESSIONAL', 'CLIENT']}>
                  <SettingsPaymentsPage />
                </PrivateRoute>
              } />
              <Route path="/settings/payments" element={
                <PrivateRoute allowedRoles={['PROFESSIONAL', 'CLIENT']}>
                  <SettingsPaymentsPage />
                </PrivateRoute>
              } />
              <Route path="/ajustes" element={
                <PrivateRoute allowedRoles={['PROFESSIONAL', 'CLIENT']}>
                  <SettingsPaymentsPage />
                </PrivateRoute>
              } />
              <Route path="/ajustes/pagos" element={
                <PrivateRoute allowedRoles={['PROFESSIONAL', 'CLIENT']}>
                  <SettingsPaymentsPage />
                </PrivateRoute>
              } />

              {/* ── Rutas protegidas — CLIENT ───────────────────────────── */}
              <Route path="/mis-solicitudes" element={
                <PrivateRoute allowedRoles={['CLIENT', 'PROFESSIONAL']}>
                  <Navigate to="/dashboard?tab=appointments" replace />
                </PrivateRoute>
              } />

              {/* ── Rutas protegidas — ADMIN ────────────────────────────── */}
              <Route path="/admin" element={
                <PrivateRoute allowedRoles={['ADMIN']}>
                  <AdminPanel />
                </PrivateRoute>
              } />

              {/* ── 404 ─────────────────────────────────────────────────── */}
              <Route path="*" element={<NotFoundPage />} />

              </Routes>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </AppProviders>
  </React.StrictMode>
);
