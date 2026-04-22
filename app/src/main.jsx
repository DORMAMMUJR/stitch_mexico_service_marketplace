import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { HomePage } from './pages/HomePage';
import { DirectoryPage } from './pages/DirectoryPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProfilePage } from './pages/ProfilePage';
import { IntecniaProfilePage } from './pages/IntecniaProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { VerificationPage } from './pages/VerificationPage';

import './style.css';

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/intecnia-profile" element={<IntecniaProfilePage />} />
        <Route path="/intecnia-profile/:id" element={<IntecniaProfilePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/verification" element={<VerificationPage />} />
        
        {/* Rutas 404 de seguridad */}
        <Route path="*" element={
          <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'Manrope', color: 'var(--primary)' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404 - Not Found</h1>
            <p style={{ color: 'var(--on-surface-variant)' }}>The page you are looking for does not exist.</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
