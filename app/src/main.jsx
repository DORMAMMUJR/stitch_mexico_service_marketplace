import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from './pages/HomePage';
import { DirectoryPage } from './pages/DirectoryPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { IntecniaProfilePage } from './pages/IntecniaProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { VerificationPage } from './pages/VerificationPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminPanel } from './pages/AdminPanel';
import { ClientDashboard } from './pages/ClientDashboard';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SupportPage } from './pages/SupportPage';
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

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
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
              <Route path="/terms"     element={<TermsPage />} />
              <Route path="/privacy"   element={<PrivacyPage />} />
              <Route path="/support"   element={<SupportPage />} />
              <Route path="/login"     element={<LoginPage />} />
              <Route path="/register"  element={<RegisterPage />} />

              {/* Perfil público — visible solo si isVerified (validado en backend) */}
              <Route path="/profile/:id"         element={<IntecniaProfilePage />} />
              {/* Alias legacy → redirige a la ruta canónica */}
              <Route path="/intecnia-profile"    element={<Navigate to="/directory" replace />} />
              <Route path="/intecnia-profile/:id" element={<Navigate to="/profile/:id" replace />} />

              {/* ── Rutas protegidas — PROFESSIONAL ────────────────────── */}
              <Route path="/dashboard" element={
                <PrivateRoute
                  allowedRoles={['PROFESSIONAL']}
                  requireCompleteProfile
                >
                  <DashboardPage />
                </PrivateRoute>
              } />

              <Route path="/verification" element={
                <PrivateRoute allowedRoles={['PROFESSIONAL', 'CLIENT']}>
                  <VerificationPage />
                </PrivateRoute>
              } />

              {/* ── Rutas protegidas — CLIENT ───────────────────────────── */}
              <Route path="/mis-solicitudes" element={
                <PrivateRoute allowedRoles={['CLIENT']}>
                  <ClientDashboard />
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
  </React.StrictMode>
);
