
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
import { Finance } from './pages/Finance';
import { Services } from './pages/Services';
import { Comandas } from './pages/Comandas';
import { Products } from './pages/Products';
import { VirtualRooms } from './pages/VirtualRooms';
import { MeetingRoom } from './pages/MeetingRoom';
import { BotIntegration } from './pages/BotIntegration';
import { PEI } from './pages/PEI';
import { ClinicalTools } from './pages/ClinicalTools';
import { Records } from './pages/Records';
import { CaseStudies } from './pages/CaseStudies';
import { Documents } from './pages/Documents';
import { Forms } from './pages/Forms';
import { FormsList } from './pages/FormsList';
import { DocGenerator } from './pages/DocGenerator';
import { BestClients } from './pages/BestClients';
import { Performance } from './pages/Performance';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Privacy } from './pages/Privacy';
import { Help } from './pages/Help';
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
  
  // Se houver restrição de cargo, permite se o usuário for o cargo exigido OU for o 'admin' da clínica
  if (allowedRoles && user && !allowedRoles.includes(user.role) && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

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
      <Route path="/virtual-rooms" element={<ProtectedRoute><VirtualRooms /></ProtectedRoute>} />
      <Route path="/meeting/:id" element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />
      <Route path="/bot" element={<ProtectedRoute><BotIntegration /></ProtectedRoute>} />
      
      {/* Rotas Clínicas Avançadas */}
      <Route path="/pei" element={<ProtectedRoute><PEI /></ProtectedRoute>} />
      <Route path="/clinical-tools" element={<ProtectedRoute><ClinicalTools /></ProtectedRoute>} />
      <Route path="/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
      <Route path="/cases" element={<ProtectedRoute><CaseStudies /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/forms" element={<ProtectedRoute><Forms /></ProtectedRoute>} />
      <Route path="/forms/list" element={<ProtectedRoute><FormsList /></ProtectedRoute>} />
      
      {/* Rotas de Gestão e Financeiro (Acessíveis por Admin) */}
      <Route path="/professionals" element={<ProtectedRoute allowedRoles={['admin']}><Professionals /></ProtectedRoute>} />
      <Route path="/permissions" element={<ProtectedRoute allowedRoles={['admin']}><Permissions /></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute allowedRoles={['admin']}><Services /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute allowedRoles={['admin']}><Products /></ProtectedRoute>} />
      <Route path="/comandas" element={<ProtectedRoute allowedRoles={['admin']}><Comandas /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute allowedRoles={['admin']}><Finance /></ProtectedRoute>} />
      <Route path="/doc-generator" element={<ProtectedRoute allowedRoles={['admin']}><DocGenerator /></ProtectedRoute>} />
      <Route path="/best-clients" element={<ProtectedRoute allowedRoles={['admin']}><BestClients /></ProtectedRoute>} />
      <Route path="/performance" element={<ProtectedRoute allowedRoles={['admin']}><Performance /></ProtectedRoute>} />

      {/* Rotas de Sistema e Perfil */}
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
      
      {/* Redirecionamento Inicial conforme cargo */}
      <Route path="*" element={user?.role === 'super_admin' ? <Navigate to="/master" /> : <Navigate to="/" />} />
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
