import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useParams, BrowserRouter } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { Sidebar } from './components/Layout/Sidebar';
import { Topbar } from './components/Layout/Topbar';
import { AuroraAssistant } from './components/AI/AuroraAssistant';
import { OnboardingController } from './components/Onboarding/OnboardingController';
import { LandingPage } from './pages/LandingPage';
import { Login } from './components/Auth/Login';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { PatientDetail } from './pages/PatientDetail';
import { Agenda } from './pages/Agenda';
import { VirtualRooms } from './pages/VirtualRooms';
import { MeetingRoom } from './pages/MeetingRoom';
import { Forms } from './pages/Forms';
import { FormsList } from './pages/FormsList';
import { FormsMetrics } from './pages/FormsMetrics';
import { FormEditor } from './pages/FormEditor';
import { FormResponses } from './pages/FormResponses';
import { PublicProfile } from './pages/PublicProfile';
import { ExternalForm } from './pages/ExternalForm';
import { ResetPassword } from './pages/ResetPassword';
import { SuperAdmin } from './pages/SuperAdmin';
import { BotIntegration } from './pages/BotIntegration';
import { PEI } from './pages/PEI';
import { ClinicalTools } from './pages/ClinicalTools';
import { DocumentVault } from './pages/DocumentVault';
import { TCCPage } from './pages/clinical-tools/TCC';
import { SchemaPage } from './pages/clinical-tools/Schema';
import { PsychoanalysisPage } from './pages/clinical-tools/Psychoanalysis';
import { HumanismPage } from './pages/clinical-tools/Humanism';
import { ACTPage } from './pages/clinical-tools/ACT';
import { DBTPage } from './pages/clinical-tools/DBT';
import { EMDRPage } from './pages/clinical-tools/EMDR';
import { SistemicaPage } from './pages/clinical-tools/Sistemica';
import { JunguianaPage } from './pages/clinical-tools/Junguiana';
import { ComportamentalPage } from './pages/clinical-tools/Comportamental';
import { IntegrativaPage } from './pages/clinical-tools/Integrativa';
import { FAPPage } from './pages/clinical-tools/FAP';
import { MindfulnessPage } from './pages/clinical-tools/Mindfulness';
import { PositivePsychologyPage } from './pages/clinical-tools/PositivePsychology';
import { PlayTherapyPage } from './pages/clinical-tools/PlayTherapy';
import { CoupleTherapyPage } from './pages/clinical-tools/CoupleTherapy';
import { ParentingGuidancePage } from './pages/clinical-tools/ParentingGuidance';
import { DASS21Page } from './pages/clinical-tools/DASS21';
import { DASS21Public } from './pages/external/DASS21Public';
import { DISCPublic } from './pages/external/DISCPublic';
import { DISCProfessionalPage } from './pages/clinical-tools/DiscProfessional';
import { Records } from './pages/Records';
import { CaseStudies } from './pages/CaseStudies';
import { Documents } from './pages/Documents';
import { DocGenerator } from './pages/DocGenerator';
import { Professionals } from './pages/Professionals';
import { Services } from './pages/Services';
import { Products } from './pages/Products';
import { Comandas } from './pages/Comandas';
import { LivroCaixa } from './pages/LivroCaixa';
import { Finance } from './pages/Finance';
import { BestClients } from './pages/BestClients';
import { Performance } from './pages/Performance';
import { Messages } from './pages/Messages';
import { Settings } from './pages/Settings';
import Disc from './pages/Disc';
import { Approaches } from './pages/Approaches';
import { Instruments } from './pages/Instruments';
import { Profile } from './pages/Profile';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Help } from './pages/Help';
import logoUrl from './images/logo-psiflux.png';
import logoDarkUrl from './images/logopsiflux-para-fundo-escuro.png';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const location = useLocation();

  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  }, [location]);

  return (
    <div className="flex h-screen w-full bg-slate-50/80 text-slate-800 font-sans overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={logout} />
      <div className={`flex-1 flex flex-col min-w-0 h-full transition-all duration-300 ${isSidebarOpen ? 'lg:ml-[250px]' : 'lg:ml-0'}`}>
        <Topbar onMenuClick={() => setSidebarOpen(!isSidebarOpen)} user={user as any} onLogout={logout} />
        <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6">
          <div className="max-w-[1600px] mx-auto pb-8">{children}</div>
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
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';

  if (isInitializing) {
    return (
      <div className={`min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden transition-all duration-700 ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
        <div className={`absolute top-0 right-0 w-[50vh] h-[50vh] rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px] pointer-events-none ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50/50'}`} />
        <div className={`absolute bottom-0 left-0 w-[50vh] h-[50vh] rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px] pointer-events-none ${isDark ? 'bg-violet-500/10' : 'bg-violet-50/50'}`} />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-12 transform-gpu hover:scale-105 transition-transform duration-700">
            <div className={`absolute -inset-10 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-500/10'}`} />
            <div className={`w-32 h-32 rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.15)] flex items-center justify-center p-2 relative z-10 ring-1 ${isDark ? 'bg-slate-900 ring-slate-800' : 'bg-white ring-slate-100/50'}`}>
               <img src={isDark ? logoDarkUrl : logoUrl} alt="PsiFlux" className="w-full h-full object-contain" />
            </div>
            <div className={`absolute -inset-2 border rounded-[2.8rem] animate-[spin_8s_linear_infinite] ${isDark ? 'border-indigo-500/30' : 'border-indigo-200/50'}`} />
          </div>

          <div className="text-center space-y-4 animate-slideUpFade">
            <h1 className="text-4xl font-display font-black tracking-tight flex items-baseline justify-center gap-0.5">
              <span className={isDark ? "text-slate-100" : "text-slate-900"}>Psi</span>
              <span className="text-indigo-600">Flux</span>
            </h1>
            <div className="flex flex-col items-center gap-4">
               <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <p className={`font-black tracking-[0.1em] text-[10px] uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Carregando seu consultório
                  </p>
               </div>
               
               <div className="flex gap-2.5">
                  <div className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s] ${isDark ? 'bg-indigo-500' : 'bg-indigo-600'}`}></div>
                  <div className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s] ${isDark ? 'bg-indigo-400/80' : 'bg-indigo-400'}`}></div>
                  <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-indigo-300/60' : 'bg-indigo-200'}`}></div>
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
      <Route path="/f/dass-21" element={<DASS21Public />} />
      <Route path="/f/disc" element={<DISCPublic />} />
      <Route path="/f/:hash" element={<ExternalForm />} />
      <Route path="/p/:slug" element={<PublicProfile />} />

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
      <Route path="/caixa-ferramentas/tcc" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><TCCPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/esquemas" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><SchemaPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/psicanalise" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><PsychoanalysisPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/humanista" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><HumanismPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/act" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><ACTPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/dbt" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><DBTPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/emdr" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><EMDRPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/sistemica" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><SistemicaPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/junguiana" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><JunguianaPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/comportamental" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><ComportamentalPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/integrativa" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><IntegrativaPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/fap" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><FAPPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/mindfulness" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><MindfulnessPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/positiva" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><PositivePsychologyPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/infantil" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><PlayTherapyPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/casal" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><CoupleTherapyPage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/pais" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><ParentingGuidancePage /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/dass-21" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><DASS21Page /></ProtectedRoute>} />
      <Route path="/caixa-ferramentas/disc-avaliativo" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><DISCProfessionalPage /></ProtectedRoute>} />
      <Route path="/prontuario" element={<ProtectedRoute requiredPermission="view_medical_records"><Records /></ProtectedRoute>} />
      <Route path="/analises" element={<ProtectedRoute requiredPermission="view_medical_records"><Records defaultTab="analysis" /></ProtectedRoute>} />
      <Route path="/estudos-de-caso" element={<ProtectedRoute><CaseStudies /></ProtectedRoute>} />
      <Route path="/documentos" element={<ProtectedRoute requiredPermission="manage_documents"><Documents /></ProtectedRoute>} />
      <Route path="/formularios" element={<ProtectedRoute requiredPermission="manage_forms"><Forms /></ProtectedRoute>} />
      <Route path="/formularios/lista" element={<ProtectedRoute requiredPermission="manage_forms"><FormsList /></ProtectedRoute>} />
      <Route path="/formularios/metricas" element={<ProtectedRoute requiredPermission="manage_forms"><FormsMetrics /></ProtectedRoute>} />
      <Route path="/formularios/novo" element={<ProtectedRoute requiredPermission="manage_forms"><FormEditor /></ProtectedRoute>} />
      <Route path="/formularios/respostas" element={<ProtectedRoute requiredPermission="manage_forms"><FormResponses /></ProtectedRoute>} />
      <Route path="/formularios/:id/respostas" element={<ProtectedRoute requiredPermission="manage_forms"><FormResponses /></ProtectedRoute>} />
      <Route path="/formularios/:id" element={<ProtectedRoute requiredPermission="manage_forms"><FormEditor /></ProtectedRoute>} />
      <Route path="/instrumentos" element={<ProtectedRoute requiredPermission="manage_clinical_tools"><Instruments /></ProtectedRoute>} />
      <Route path="/disc" element={<ProtectedRoute><Disc /></ProtectedRoute>} />
      <Route path="/termos" element={<ProtectedRoute requiredPermission="manage_documents"><DocumentVault /></ProtectedRoute>} />
      <Route path="/abordagens" element={<ProtectedRoute><Approaches /></ProtectedRoute>} />
      <Route path="/gerador-documentos" element={<ProtectedRoute requiredPermission="manage_documents"><DocGenerator /></ProtectedRoute>} />
      <Route path="/profissionais" element={<ProtectedRoute requiredPermission="manage_professionals"><Professionals /></ProtectedRoute>} />
      <Route path="/servicos" element={<ProtectedRoute requiredPermission="manage_services"><Services /></ProtectedRoute>} />
      <Route path="/produtos" element={<ProtectedRoute requiredPermission="manage_products"><Products /></ProtectedRoute>} />
      <Route path="/comandas" element={<ProtectedRoute requiredPermission="view_all_comandas"><Comandas /></ProtectedRoute>} />
      <Route path="/livro-caixa" element={<ProtectedRoute requiredPermission="view_financial_reports"><LivroCaixa /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute requiredPermission="view_financial_reports"><Finance /></ProtectedRoute>} />
      <Route path="/melhores-clientes" element={<ProtectedRoute requiredPermission="view_performance_reports"><BestClients /></ProtectedRoute>} />
      <Route path="/desempenho" element={<ProtectedRoute requiredPermission="view_performance_reports"><Performance /></ProtectedRoute>} />
      <Route path="/mensagens" element={<ProtectedRoute requiredPermission="access_messages"><Messages /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute requiredPermission="manage_clinic_settings"><Settings /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/privacidade" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
      <Route path="/termos" element={<ProtectedRoute><Terms /></ProtectedRoute>} />
      <Route path="/ajuda" element={<ProtectedRoute><Help /></ProtectedRoute>} />

      {/* Redirecionamento de legado */}
      <Route path="/meeting/:id" element={<RedirectToSala />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserPreferencesProvider>
          <LanguageProvider>
            <ThemeProvider>
              <ToastProvider>
                <AppRoutes />
              </ToastProvider>
            </ThemeProvider>
          </LanguageProvider>
        </UserPreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
