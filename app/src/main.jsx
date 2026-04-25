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
import { AuthProvider } from './hooks/useAuth';

import './style.css';

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
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/directory" element={<DirectoryPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/profile/:id" element={<IntecniaProfilePage />} />
            <Route path="/intecnia-profile" element={<IntecniaProfilePage />} />
            <Route path="/intecnia-profile/:id" element={<IntecniaProfilePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/verification" element={<VerificationPage />} />

            {/* Ruta 404 */}
            <Route path="*" element={
              <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'Manrope', color: 'var(--primary)' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
                <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>La página que buscas no existe.</p>
                <a href="/" style={{ color: 'var(--secondary)', fontWeight: 600 }}>← Volver al inicio</a>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
