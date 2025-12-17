
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Layout/Sidebar';
import { Topbar } from './components/Layout/Topbar';
import { Login } from './components/Auth/Login';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { Agenda } from './pages/Agenda';
import { Professionals } from './pages/Professionals';
import { Permissions } from './pages/Permissions';
import { SuperAdmin } from './pages/SuperAdmin';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = React.useState(() => window.innerWidth >= 1024);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={logout} />
      <div className={`flex-1 flex flex-col min-w-0 h-full transition-all duration-300 ${isSidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-0'}`}>
        <Topbar onMenuClick={() => setSidebarOpen(!isSidebarOpen)} user={user as any} onLogout={logout} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto pb-10">{children}</div>
        </main>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const AppRoutes: React.FC = () => {
  const { isSuperAdmin } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={() => {}} />} />
      
      {/* Rotas de Super Admin */}
      <Route path="/master" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SuperAdmin onLogout={() => {}} />
        </ProtectedRoute>
      } />

      {/* Rotas Comuns de Clínica */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
      <Route path="/professionals" element={<ProtectedRoute allowedRoles={['admin']}><Professionals /></ProtectedRoute>} />
      <Route path="/permissions" element={<ProtectedRoute allowedRoles={['admin']}><Permissions /></ProtectedRoute>} />
      
      {/* Redirecionamento Inicial conforme cargo */}
      <Route path="*" element={isSuperAdmin ? <Navigate to="/master" /> : <Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
