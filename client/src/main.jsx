import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { api } from './lib/api';
import { Loading } from './components/UI';
import { LanguageProvider } from './lib/i18n';
import { SyncProvider } from './lib/syncContext';
import { AdminAppearanceProvider } from './lib/adminAppearance';
import './index.css';

const AdminLayout=lazy(()=>import('./components/AdminLayout').then(module=>({default:module.AdminLayout})));
const Home=lazy(()=>import('./pages/Public').then(module=>({default:module.Home})));
const Verify=lazy(()=>import('./pages/Public').then(module=>({default:module.Verify})));
const Login=lazy(()=>import('./pages/Auth').then(module=>({default:module.Login})));
const Dashboard=lazy(()=>import('./pages/Dashboard').then(module=>({default:module.Dashboard})));
const Students=lazy(()=>import('./pages/Students').then(module=>({default:module.Students})));
const Branches=lazy(()=>import('./pages/Branches').then(module=>({default:module.Branches})));
const Certificates=lazy(()=>import('./pages/Certificates').then(module=>({default:module.Certificates})));
const Templates=lazy(()=>import('./pages/Templates').then(module=>({default:module.Templates})));
const GenerateCerts=lazy(()=>import('./pages/GenerateCerts').then(module=>({default:module.GenerateCerts})));
const ImportCSV=lazy(()=>import('./pages/Import').then(module=>({default:module.ImportCSV})));
const Settings=lazy(()=>import('./pages/Settings').then(module=>({default:module.Settings})));
const RecentActivity=lazy(()=>import('./pages/RecentActivity').then(module=>({default:module.RecentActivity})));
const Reports=lazy(()=>import('./pages/Reports').then(module=>({default:module.Reports})));
const PublicSupportLayout=lazy(()=>import('./components/PublicSupport').then(module=>({default:module.PublicSupportLayout})));


function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const sessionRequest=useRef(null);

  useEffect(() => {
    const controller=new AbortController();sessionRequest.current=controller;
    api('/auth/me',{signal:controller.signal})
      .then((r) => {if(!controller.signal.aborted)setUser(r.user);})
      .catch(() => {})
      .finally(() => {if(!controller.signal.aborted)setChecking(false);});
    return()=>controller.abort();
  }, []);

  function handleLogin(admin){sessionRequest.current?.abort();setUser(admin);setChecking(false);}

  const checkingSession=<Loading text="Menyemak sesi pentadbir..." size="sm"/>;

  return (
    <LanguageProvider>
      <BrowserRouter>
      <AdminAppearanceProvider user={user}>
      <SyncProvider>
        <Suspense fallback={<Loading text="Memuatkan halaman..." size="sm"/>}>
        <Routes>
          <Route element={<PublicSupportLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/verify/:token" element={<Verify />} />
          </Route>
          <Route path="/admin/login" element={user ? <Navigate to="/admin" replace /> : <Login onLogin={handleLogin} />} />
          <Route path="/admin" element={checking ? checkingSession : user ? <AdminLayout user={user} onLogout={() => setUser(null)} /> : <Navigate to="/admin/login" replace />}>
            <Route index element={<Dashboard />} />
            <Route path="pesilat" element={<Students />} />
            <Route path="cawangan" element={<Branches />} />
            <Route path="templates" element={<Templates />} />
            <Route path="jana-sijil" element={<GenerateCerts />} />
            <Route path="sijil" element={<Certificates />} />
            <Route path="aktiviti" element={<RecentActivity />} />
            <Route path="laporan" element={<Reports />} />
            <Route path="import" element={<ImportCSV />} />
            <Route path="tetapan" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </SyncProvider>
      </AdminAppearanceProvider>
      </BrowserRouter>
    </LanguageProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
