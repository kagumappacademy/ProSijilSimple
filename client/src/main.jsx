import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { api } from './lib/api';
import { Loading } from './components/UI';
import { AdminLayout } from './components/AdminLayout';
import { Home, Verify } from './pages/Public';
import { Login } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Certificates } from './pages/Certificates';
import { Templates } from './pages/Templates';
import { GenerateCerts } from './pages/GenerateCerts';
import { ImportCSV } from './pages/Import';
import { Settings } from './pages/Settings';
import { ThemeProvider, useTheme } from './lib/theme';
import { LanguageProvider } from './lib/i18n';
import './index.css';

function MainRouter({ user, setUser }) {
  const { isDark } = useTheme();

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton duration={4000} theme={isDark ? 'dark' : 'light'} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/verify/:token" element={<Verify />} />
        <Route
          path="/admin/login"
          element={user ? <Navigate to="/admin" replace /> : <Login onLogin={setUser} />}
        />
        <Route
          path="/admin"
          element={
            user ? (
              <AdminLayout user={user} onLogout={() => setUser(null)} />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="pesilat" element={<Students />} />
          <Route path="templates" element={<Templates />} />
          <Route path="jana-sijil" element={<GenerateCerts />} />
          <Route path="sijil" element={<Certificates />} />
          <Route path="import" element={<ImportCSV />} />
          <Route path="tetapan" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas dark:bg-[#0b0f17]">
        <Loading />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <MainRouter user={user} setUser={setUser} />
      </LanguageProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
