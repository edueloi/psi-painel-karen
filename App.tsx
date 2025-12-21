import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import { FormEditor } from './pages/FormEditor';
import { FormResponses } from './pages/FormResponses';
import { ExternalForm } from './pages/ExternalForm';
import { DocGenerator } from './pages/DocGenerator';
import { BestClients } from './pages/BestClients';
import { Performance } from './pages/Performance';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Privacy } from './pages/Privacy';
import { Help } from './pages/Help';
import { Messages } from './pages/Messages';
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
  const { isAuthenticated, user, isAdmin } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Se houver restricao de cargo:
  // Permite se o usuario tiver o cargo na lista OU se ele for o admin da clinica
  if (allowedRoles && user && !allowedRoles.includes(user.role) && !isAdmin) {
    // A unica excecao e se um admin tentar acessar rotas de super_admin sem permissao
    return <Navigate to="/" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const RedirectToSala: React.FC = () => {
  const { id } = useParams();
  return <Navigate to={`/sala/${id || ''}`} replace />;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={() => {}} />} />
      <Route path="/f/:hash" element={<ExternalForm />} />

      {/* Rotas de Super Admin */}
      <Route
        path="/painel-master"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <SuperAdmin onLogout={() => {}} />
          </ProtectedRoute>
        }
      />

      {/* Rotas comuns da clinica */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/pacientes" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
      <Route path="/salas-virtuais" element={<ProtectedRoute><VirtualRooms /></ProtectedRoute>} />
      <Route path="/sala/:id" element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />
      <Route path="/bot" element={<ProtectedRoute><BotIntegration /></ProtectedRoute>} />

      {/* Rotas clinicas avancadas */}
      <Route path="/neurodesenvolvimento" element={<ProtectedRoute><PEI /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas" element={<ProtectedRoute><ClinicalTools /></ProtectedRoute>} />
      <Route path="/prontuario" element={<ProtectedRoute><Records /></ProtectedRoute>} />
      <Route path="/estudos-de-caso" element={<ProtectedRoute><CaseStudies /></ProtectedRoute>} />
      <Route path="/documentos" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/formularios" element={<ProtectedRoute><Forms /></ProtectedRoute>} />
      <Route path="/formularios/lista" element={<ProtectedRoute><FormsList /></ProtectedRoute>} />
      <Route path="/formularios/novo" element={<ProtectedRoute><FormEditor /></ProtectedRoute>} />
      <Route path="/formularios/:id" element={<ProtectedRoute><FormEditor /></ProtectedRoute>} />
      <Route path="/formularios/:id/respostas" element={<ProtectedRoute><FormResponses /></ProtectedRoute>} />

      {/* Rotas de gestao e financeiro */}
      <Route path="/profissionais" element={<ProtectedRoute allowedRoles={['admin']}><Professionals /></ProtectedRoute>} />
      <Route path="/permissoes" element={<ProtectedRoute allowedRoles={['admin']}><Permissions /></ProtectedRoute>} />
      <Route path="/servicos" element={<ProtectedRoute allowedRoles={['admin']}><Services /></ProtectedRoute>} />
      <Route path="/produtos" element={<ProtectedRoute allowedRoles={['admin']}><Products /></ProtectedRoute>} />
      <Route path="/comandas" element={<ProtectedRoute allowedRoles={['admin']}><Comandas /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute allowedRoles={['admin']}><Finance /></ProtectedRoute>} />
      <Route path="/gerador-documentos" element={<ProtectedRoute allowedRoles={['admin']}><DocGenerator /></ProtectedRoute>} />
      <Route path="/melhores-clientes" element={<ProtectedRoute allowedRoles={['admin']}><BestClients /></ProtectedRoute>} />
      <Route path="/desempenho" element={<ProtectedRoute allowedRoles={['admin']}><Performance /></ProtectedRoute>} />

      {/* Rotas de sistema e perfil */}
      <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/privacidade" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
      <Route path="/ajuda" element={<ProtectedRoute><Help /></ProtectedRoute>} />
      <Route path="/mensagens" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

      {/* Rotas antigas (redirect) */}
      <Route path="/master" element={<Navigate to="/painel-master" replace />} />
      <Route path="/patients" element={<Navigate to="/pacientes" replace />} />
      <Route path="/virtual-rooms" element={<Navigate to="/salas-virtuais" replace />} />
      <Route path="/meeting/:id" element={<RedirectToSala />} />
      <Route path="/pei" element={<Navigate to="/neurodesenvolvimento" replace />} />
      <Route path="/clinical-tools" element={<Navigate to="/caixa-ferramentas" replace />} />
      <Route path="/records" element={<Navigate to="/prontuario" replace />} />
      <Route path="/cases" element={<Navigate to="/estudos-de-caso" replace />} />
      <Route path="/documents" element={<Navigate to="/documentos" replace />} />
      <Route path="/forms" element={<Navigate to="/formularios" replace />} />
      <Route path="/forms/list" element={<Navigate to="/formularios/lista" replace />} />
      <Route path="/forms/new" element={<Navigate to="/formularios/novo" replace />} />
      <Route path="/professionals" element={<Navigate to="/profissionais" replace />} />
      <Route path="/permissions" element={<Navigate to="/permissoes" replace />} />
      <Route path="/services" element={<Navigate to="/servicos" replace />} />
      <Route path="/products" element={<Navigate to="/produtos" replace />} />
      <Route path="/finance" element={<Navigate to="/financeiro" replace />} />
      <Route path="/doc-generator" element={<Navigate to="/gerador-documentos" replace />} />
      <Route path="/best-clients" element={<Navigate to="/melhores-clientes" replace />} />
      <Route path="/performance" element={<Navigate to="/desempenho" replace />} />
      <Route path="/profile" element={<Navigate to="/perfil" replace />} />
      <Route path="/settings" element={<Navigate to="/configuracoes" replace />} />
      <Route path="/privacy" element={<Navigate to="/privacidade" replace />} />
      <Route path="/help" element={<Navigate to="/ajuda" replace />} />
      <Route path="/messages" element={<Navigate to="/mensagens" replace />} />

      {/* Redirecionamento inicial conforme cargo */}
      <Route path="*" element={user?.role === 'super_admin' ? <Navigate to="/painel-master" /> : <Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
