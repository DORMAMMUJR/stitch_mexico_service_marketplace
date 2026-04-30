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

import './style.css';

// Dashboard unificado: renderiza ClientDashboard o DashboardPage según el rol
function SmartDashboard() {
  const { user } = useAuth();
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
              <PrivateRoute allowedRoles={['PROFESSIONAL']}>
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
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
