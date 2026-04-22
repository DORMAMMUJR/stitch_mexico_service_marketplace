import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DirectoryPage } from './pages/DirectoryPage';
// import { HomePage } from './pages/HomePage';
// import { CategoriesPage } from './pages/CategoriesPage';
// import { ProfilePage } from './pages/ProfilePage';
// import { DashboardPage } from './pages/DashboardPage';
// import { VerificationPage } from './pages/VerificationPage';
import './style.css';

// Placeholders temporales para las rutas no migradas aún
const PlaceholderPage = ({ title }) => (
  <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Manrope' }}>
    <h1>{title}</h1>
    <p>Esta página está siendo migrada a React.</p>
  </div>
);

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DirectoryPage />} /> {/* Redirigimos el Home al Directorio por ahora */}
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/categories" element={<PlaceholderPage title="Categories" />} />
        <Route path="/profile/:id" element={<PlaceholderPage title="Professional Profile" />} />
        <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" />} />
        <Route path="/verification" element={<PlaceholderPage title="Trust Center / Verification" />} />
        
        {/* Rutas 404 de seguridad */}
        <Route path="*" element={<PlaceholderPage title="404 - Not Found" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
