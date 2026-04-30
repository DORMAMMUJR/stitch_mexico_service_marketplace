import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { HomePage } from './pages/HomePage';
import { DirectoryPage } from './pages/DirectoryPage';
import { CategoriesPage } from './pages/CategoriesPage';

import { IntecniaProfilePage } from './pages/IntecniaProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { VerificationPage } from './pages/VerificationPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AdminPanel } from './pages/AdminPanel';
import { ClientDashboard } from './pages/ClientDashboard';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SupportPage } from './pages/SupportPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ToastContext';
import { PrivateRoute } from './components/PrivateRoute';
import { VisoBot } from './components/VisoBot';

import './style.css';

// ErrorBoundary global para capturar crashes silenciosos (pantallas en blanco sin mensaje)
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#dc2626' }}>error</span>
          <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)' }}>Algo salió mal</h2>
          <p style={{ color: 'var(--on-surface-variant)', fontFamily: 'monospace', fontSize: '0.875rem', background: 'var(--surface-container)', padding: '1rem', borderRadius: '8px', maxWidth: '600px' }}>
            {this.state.error?.message || 'Error desconocido'}
          </p>
          <button onClick={() => window.location.href = '/'} style={{ padding: '0.75rem 2rem', borderRadius: '8px', background: 'var(--secondary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Volver al inicio</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Dashboard unificado: renderiza ClientDashboard o DashboardPage según el rol
function SmartDashboard() {
  const { user, isLoading } = useAuth();
  // Esperar confirmación del servidor antes de decidir el componente
  // Evita flash visual si el rol en localStorage no coincide con el de la BD
  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
    </div>
  );
  if (!user) return null;
  if (user.role === 'PROFESSIONAL') return <DashboardPage />;
  return <ClientDashboard />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutos de caché
    },
  },
});

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/directory" element={<DirectoryPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/profile/:id" element={<IntecniaProfilePage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/support" element={<SupportPage />} />

            {/* Rutas Protegidas: Cualquier usuario autenticado */}
            <Route path="/dashboard" element={
              <PrivateRoute allowedRoles={['CLIENT', 'PROFESSIONAL', 'ADMIN']}>
                <SmartDashboard />
              </PrivateRoute>
            } />
            <Route path="/mis-solicitudes" element={
              <PrivateRoute allowedRoles={['CLIENT', 'PROFESSIONAL', 'ADMIN']}>
                <SmartDashboard />
              </PrivateRoute>
            } />
            <Route path="/verification" element={
              <PrivateRoute allowedRoles={['CLIENT', 'PROFESSIONAL']}>
                <VerificationPage />
              </PrivateRoute>
            } />

            {/* Rutas Protegidas: ADMIN */}
            <Route path="/admin" element={
              <PrivateRoute allowedRoles={['ADMIN']}>
                <AdminPanel />
              </PrivateRoute>
            } />

            {/* Ruta 404 */}
            <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <VisoBot />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
