
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Layout/Sidebar';
import { Topbar } from './components/Layout/Topbar';
import { Login } from './components/Auth/Login';
import { ForgotPassword } from './components/Auth/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { Agenda } from './pages/Agenda';
import { Documents } from './pages/Documents';
import { DocGenerator } from './pages/DocGenerator'; // NEW
import { Forms } from './pages/Forms';
import { FormsList } from './pages/FormsList';
import { Records } from './pages/Records';
import { Messages } from './pages/Messages';
import { Services } from './pages/Services';
import { Comandas } from './pages/Comandas';
import { Products } from './pages/Products';
import { BestClients } from './pages/BestClients';
import { Performance } from './pages/Performance';
import { Finance } from './pages/Finance';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Privacy } from './pages/Privacy';
import { Help } from './pages/Help';
import { Professionals } from './pages/Professionals';
import { FormBuilder } from './components/Forms/FormBuilder';
import { ExternalForm } from './pages/ExternalForm';
import { MeetingRoom } from './pages/MeetingRoom';
import { VirtualRooms } from './pages/VirtualRooms';
import { BotIntegration } from './pages/BotIntegration';
import { CaseStudies } from './pages/CaseStudies';
import { PEI } from './pages/PEI'; 
import { ClinicalTools } from './pages/ClinicalTools'; // NEW
import { SuperAdmin } from './pages/SuperAdmin'; 
import { MOCK_USERS } from './constants';
import { LanguageProvider } from './contexts/LanguageContext';

const MainLayout: React.FC<{ children: React.ReactNode, onLogout: () => void }> = ({ children, onLogout }) => {
  // Initialize open on desktop, closed on mobile
  const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const user = MOCK_USERS[0]; // Mock user

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar - Fixed Position */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onLogout={onLogout}
      />
      
      {/* Content Wrapper - Adjusts margin on desktop when sidebar is open */}
      <div 
        className={`flex-1 flex flex-col min-w-0 h-full transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isSidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-0'}`}
      >
        {/* Top Navbar */}
        <Topbar 
            onMenuClick={toggleSidebar} 
            user={user}
            onLogout={onLogout} 
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative">
          <div className="max-w-7xl mx-auto pb-10 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const FormBuilderWrapper: React.FC = () => {
    const navigate = useNavigate();
    return (
        <FormBuilder 
            onSave={(data) => {
                console.log('Saved:', data);
                navigate('/forms/list');
            }}
            onCancel={() => navigate('/forms')}
        />
    );
};

const AppRoutes: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<'GUEST' | 'USER' | 'SUPER_ADMIN'>('GUEST');

  const handleLogin = (role: string = 'USER') => {
    setAuthStatus(role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER');
  };

  const handleLogout = () => {
    setAuthStatus('GUEST');
  };

  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          authStatus !== 'GUEST' ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route path="/f/:hash" element={<ExternalForm />} />
        
        {/* Meeting Room is standalone, NO sidebar, Accessible by GUEST or USER */}
        <Route path="/meeting/:id" element={<MeetingRoom isGuest={authStatus === 'GUEST'} />} />

        {/* Protected Routes */}
        <Route path="/*" element={
          authStatus === 'GUEST' ? (
            <Navigate to="/login" replace />
          ) : authStatus === 'SUPER_ADMIN' ? (
            // SUPER ADMIN LAYOUT ROUTE
            <SuperAdmin onLogout={handleLogout} />
          ) : (
            // REGULAR USER MAIN LAYOUT
            <MainLayout onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/patients" element={<Patients />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/virtual-rooms" element={<VirtualRooms />} />
                <Route path="/bot" element={<BotIntegration />} />
                <Route path="/cases" element={<CaseStudies />} />
                <Route path="/pei" element={<PEI />} /> 
                <Route path="/clinical-tools" element={<ClinicalTools />} /> 
                <Route path="/documents" element={<Documents />} />
                <Route path="/doc-generator" element={<DocGenerator />} />
                
                {/* Services & Packages Module */}
                <Route path="/services" element={<Services />} />
                <Route path="/comandas" element={<Comandas />} />
                
                {/* Inventory & Products Module */}
                <Route path="/products" element={<Products />} />

                {/* Team & Professionals */}
                <Route path="/professionals" element={<Professionals />} />

                <Route path="/best-clients" element={<BestClients />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/finance" element={<Finance />} />

                {/* Forms Module */}
                <Route path="/forms" element={<Forms />} />
                <Route path="/forms/list" element={<FormsList />} />
                <Route path="/forms/new" element={<FormBuilderWrapper />} />
                
                {/* Records Module */}
                <Route path="/records" element={<Records />} />
                
                {/* Messages Module */}
                <Route path="/messages" element={<Messages />} />
                
                {/* Account & Settings */}
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/help" element={<Help />} />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MainLayout>
          )
        } />
      </Routes>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppRoutes />
    </LanguageProvider>
  );
};

export default App;
