import React from 'react';
import logoUrl from './images/logo-psiflux.png';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Sidebar } from './components/Layout/Sidebar';
import { Topbar } from './components/Layout/Topbar';
import { Login } from './components/Auth/Login';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { PatientDetail } from './pages/PatientDetail';
import { Agenda } from './pages/Agenda';
import { Professionals } from './pages/Professionals';
import { Permissions } from './pages/Permissions';
import { SuperAdmin } from './pages/SuperAdmin';
import { Finance } from './pages/Finance';
import { LivroCaixa } from './pages/LivroCaixa';
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
import Disc from './pages/Disc';
import { FormsList } from './pages/FormsList';
import { FormsMetrics } from './pages/FormsMetrics';
import { FormEditor } from './pages/FormEditor';
import { FormResponses } from './pages/FormResponses';
import { FormsResponsesAll } from './pages/FormsResponsesAll';
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
import { ThemeProvider } from './contexts/ThemeContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { LandingPage } from './pages/LandingPage';
import { ResetPassword } from './pages/ResetPassword';
import { AuroraAssistant } from './components/AI/AuroraAssistant';
import { OnboardingController } from './components/Onboarding/OnboardingController';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = React.useState(() => window.innerWidth >= 1024);

  return (
    <div className="flex h-screen w-full bg-slate-50/80 text-slate-800 font-sans overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={logout} />
      <div className={`flex-1 flex flex-col min-w-0 h-full transition-all duration-300 ${isSidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-0'}`}>
        <Topbar onMenuClick={() => setSidebarOpen(!isSidebarOpen)} user={user as any} onLogout={logout} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-12">{children}</div>
        </main>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[]; requiredPermission?: string }> = ({ children, allowedRoles, requiredPermission }) => {
  const { isAuthenticated, user, isAdmin, hasPermission } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role === 'super_admin') return <Navigate to="/painel-master" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role) && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <MainLayout>
      {children}
      {user?.plan_features?.includes('aurora_ai') && <AuroraAssistant />}
      {user && <OnboardingController userId={user.id} userName={user.name || ''} />}
    </MainLayout>
  );
};

// Rota exclusiva para super_admin — sem o MainLayout da clínica
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

const RedirectToSala: React.FC = () => {
  const { id } = useParams();
  return <Navigate to={`/sala/${id || ''}`} replace />;
};

const AppRoutes: React.FC = () => {
  const { user, logout, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white relative overflow-hidden transition-all duration-700">
        <div className="absolute top-0 right-0 w-[50vh] h-[50vh] bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[50vh] h-[50vh] bg-violet-50/50 rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-12 transform-gpu hover:scale-105 transition-transform duration-700">
            <div className="absolute -inset-10 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="w-28 h-28 bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.15)] flex items-center justify-center p-4 relative z-10 ring-1 ring-slate-100/50">
               <img src={logoUrl} alt="PsiFlux" className="w-full h-full object-contain" />
            </div>
            {/* Spinning ring decorative */}
            <div className="absolute -inset-2 border border-indigo-200/50 rounded-[2.8rem] animate-[spin_8s_linear_infinite]" />
          </div>

          <div className="text-center space-y-4 animate-slideUpFade">
            <h1 className="text-4xl font-display font-black tracking-tight flex items-baseline justify-center gap-0.5">
              <span className="text-slate-900">Psi</span>
              <span className="text-indigo-600">Flux</span>
            </h1>
            <div className="flex flex-col items-center gap-4">
               <div className="flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <p className="text-slate-500 font-black tracking-[0.1em] text-[10px] uppercase">
                    Carregando seu consultório
                  </p>
               </div>
               
               <div className="flex gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-200 animate-bounce"></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login onLogin={() => {}} />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />
      <Route path="/f/:hash" element={<ExternalForm />} />

      {/* Rotas de Super Admin */}
      <Route
        path="/painel-master"
        element={
          <SuperAdminRoute>
            <SuperAdmin onLogout={logout} />
          </SuperAdminRoute>
        }
      />

      {/* Rotas comuns da clinica */}
      <Route path="/dashboard" element={<ProtectedRoute requiredPermission="view_dashboard"><Dashboard /></ProtectedRoute>} />
      <Route path="/pacientes" element={<ProtectedRoute requiredPermission="view_patients"><Patients /></ProtectedRoute>} />
      <Route path="/pacientes/:id" element={<ProtectedRoute requiredPermission="view_patients"><PatientDetail /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute requiredPermission="view_agenda"><Agenda /></ProtectedRoute>} />
      <Route path="/salas-virtuais" element={<ProtectedRoute requiredPermission="view_agenda"><VirtualRooms /></ProtectedRoute>} />
      <Route path="/sala/:id" element={<MeetingRoom />} />
      <Route path="/bot" element={<ProtectedRoute requiredPermission="manage_bot_integration"><BotIntegration /></ProtectedRoute>} />

      {/* Rotas clinicas avancadas */}
      <Route path="/neurodesenvolvimento" element={<ProtectedRoute requiredPermission="neuro_access"><PEI /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><ClinicalTools /></ProtectedRoute>} />
      <Route path="/prontuario" element={<ProtectedRoute requiredPermission="view_medical_records"><Records /></ProtectedRoute>} />
      <Route path="/estudos-de-caso" element={<ProtectedRoute><CaseStudies /></ProtectedRoute>} />
      <Route path="/documentos" element={<ProtectedRoute requiredPermission="manage_documents"><Documents /></ProtectedRoute>} />
      <Route path="/formularios" element={<ProtectedRoute requiredPermission="manage_forms"><Forms /></ProtectedRoute>} />
      <Route path="/disc" element={<ProtectedRoute><Disc /></ProtectedRoute>} />
      <Route path="/formularios/lista" element={<ProtectedRoute requiredPermission="manage_forms"><FormsList /></ProtectedRoute>} />
      <Route path="/formularios/metricas" element={<ProtectedRoute requiredPermission="manage_forms"><FormsMetrics /></ProtectedRoute>} />
      <Route path="/formularios/novo" element={<ProtectedRoute requiredPermission="manage_forms"><FormEditor /></ProtectedRoute>} />
      <Route path="/formularios/:id" element={<ProtectedRoute requiredPermission="manage_forms"><FormEditor /></ProtectedRoute>} />
      <Route path="/formularios/:id/respostas" element={<ProtectedRoute requiredPermission="manage_forms"><FormResponses /></ProtectedRoute>} />
      <Route path="/formularios/respostas" element={<ProtectedRoute requiredPermission="manage_forms"><FormsResponsesAll /></ProtectedRoute>} />

      {/* Rotas de gestao e financeiro */}
      <Route path="/profissionais" element={<ProtectedRoute requiredPermission="manage_professionals"><Professionals /></ProtectedRoute>} />
      <Route path="/permissoes" element={<ProtectedRoute requiredPermission="manage_professionals"><Permissions /></ProtectedRoute>} />
      <Route path="/servicos" element={<ProtectedRoute requiredPermission="manage_services"><Services /></ProtectedRoute>} />
      <Route path="/produtos" element={<ProtectedRoute requiredPermission="manage_products"><Products /></ProtectedRoute>} />
      <Route path="/comandas" element={<ProtectedRoute requiredPermission="view_all_comandas"><Comandas /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute requiredPermission="view_financial_reports"><Finance /></ProtectedRoute>} />
      <Route path="/livro-caixa" element={<ProtectedRoute requiredPermission="view_financial_reports"><LivroCaixa /></ProtectedRoute>} />
      <Route path="/gerador-documentos" element={<ProtectedRoute requiredPermission="manage_documents"><DocGenerator /></ProtectedRoute>} />
      <Route path="/melhores-clientes" element={<ProtectedRoute requiredPermission="view_performance_reports"><BestClients /></ProtectedRoute>} />
      <Route path="/desempenho" element={<ProtectedRoute requiredPermission="view_performance_reports"><Performance /></ProtectedRoute>} />

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
      <Route path="/forms/metrics" element={<Navigate to="/formularios/metricas" replace />} />
      <Route path="/forms/new" element={<Navigate to="/formularios/novo" replace />} />
      <Route path="/forms/responses" element={<Navigate to="/formularios/respostas" replace />} />
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
      <Route path="*" element={user?.role === 'super_admin' ? <Navigate to="/painel-master" /> : <Navigate to="/dashboard" />} />
    </Routes>
  );
};

import { ToastProvider } from './contexts/ToastContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <UserPreferencesProvider>
        <LanguageProvider>
          <ThemeProvider>
            <ToastProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </ToastProvider>
          </ThemeProvider>
        </LanguageProvider>
      </UserPreferencesProvider>
    </AuthProvider>
  );
};

export default App;
