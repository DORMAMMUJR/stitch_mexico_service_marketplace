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

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Home - Migrating</div>} />
        <Route path="/directory" element={<DirectoryPage />} />
        {/*
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/verification" element={<VerificationPage />} />
        */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
