
import React, { useState, useMemo } from 'react';
import { MOCK_PATIENTS, MOCK_PROFESSIONALS } from '../constants';
import { Patient, Professional } from '../types';
import { 
  FileText, Printer, Download, User, Calendar, DollarSign, 
  Clock, Hash, FileCheck, Receipt, BadgeCheck, AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const DocGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [docType, setDocType] = useState<'receipt' | 'attestation' | 'declaration' | 'hours'>('receipt');
  
  // Dynamic Form Data
  const [docData, setDocData] = useState({
      date: new Date().toISOString().split('T')[0],
      value: 0,
      sessions: 1,
      description: 'Sessão de Psicoterapia',
      periodStart: '',
      periodEnd: '',
      cid: '', // ICD-10
      hours: 0,
      obs: ''
  });

  const professional = MOCK_PROFESSIONALS[0]; // Current user mock
  const patient = MOCK_PATIENTS.find(p => p.id === selectedPatientId);

  const handlePrint = () => {
      const content = document.getElementById('a4-preview');
      if (content) {
          const printWindow = window.open('', '', 'height=800,width=800');
          if(printWindow) {
              printWindow.document.write('<html><head><title>Documento</title>');
              printWindow.document.write('<style>body { font-family: "Times New Roman", serif; padding: 40px; } .no-print { display: none; } .text-center { text-align: center; } .font-bold { font-weight: bold; } .text-sm { font-size: 14px; } .mb-8 { margin-bottom: 32px; } .mb-4 { margin-bottom: 16px; } .mt-12 { margin-top: 48px; } .border-t { border-top: 1px solid #000; } .w-1/2 { width: 50%; } .mx-auto { margin-left: auto; margin-right: auto; } .text-justify { text-align: justify; line-height: 1.6; }</style>');
              printWindow.document.write('</head><body>');
              printWindow.document.write(content.innerHTML);
              printWindow.document.write('</body></html>');
              printWindow.document.close();
              printWindow.print();
          }
      }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr: string) => {
      if(!dateStr) return '___/___/____';
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
  }

  // --- RENDER CONTENT BASED ON TYPE ---
  const renderDocumentContent = () => {
      if (!patient) return <div className="text-center py-20 text-slate-400">Selecione um paciente para visualizar.</div>;

      const todayFull = new Date(docData.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

      switch (docType) {
          case 'receipt':
              return (
                  <div className="text-slate-900">
                      <h2 className="text-2xl font-bold text-center mb-8 uppercase tracking-widest border-b-2 border-slate-900 pb-4">Recibo</h2>
                      
                      <p className="text-lg text-justify mb-8 leading-relaxed">
                          Recebi de <strong>{patient.name}</strong>, inscrito(a) no CPF sob nº <strong>{patient.cpf || '___.___.___-__'}</strong>, 
                          a importância de <strong>{formatCurrency(docData.value)}</strong>, referente a <strong>{docData.sessions}</strong> sessão(ões) de {docData.description}.
                      </p>

                      {docData.sessions > 1 && (
                          <div className="mb-8 p-4 bg-slate-50 border border-slate-200 text-sm">
                              <p className="font-bold mb-2">Discriminação:</p>
                              <ul className="list-disc pl-5 space-y-1">
                                  {Array.from({length: docData.sessions}).map((_, i) => (
                                      <li key={i}>Sessão {i+1} - Psicoterapia Individual</li>
                                  ))}
                              </ul>
                          </div>
                      )}

                      <p className="text-right mt-12 mb-20">São Paulo, {todayFull}</p>

                      <div className="text-center w-2/3 mx-auto">
                          <div className="border-t border-slate-800 pt-2">
                              <p className="font-bold text-lg">{professional.name}</p>
                              <p className="text-sm">{professional.profession}</p>
                              <p className="text-sm">CPF: {professional.cpfCnpj} | CRP: {professional.registrationNumber}</p>
                          </div>
                      </div>
                  </div>
              );

          case 'attestation':
              return (
                  <div className="text-slate-900">
                      <h2 className="text-2xl font-bold text-center mb-10 uppercase tracking-widest underline decoration-double underline-offset-4">Atestado Psicológico</h2>
                      
                      <p className="text-lg text-justify mb-6 leading-relaxed">
                          Atesto, para os devidos fins, que o(a) Sr(a). <strong>{patient.name}</strong> encontra-se sob meus cuidados profissionais, 
                          realizando acompanhamento psicológico.
                      </p>

                      <p className="text-lg text-justify mb-6 leading-relaxed">
                          O(A) paciente compareceu a este consultório no dia <strong>{formatDate(docData.date)}</strong> 
                          para atendimento, no período das <strong>{new Date().getHours()}:00 às {new Date().getHours() + 1}:00</strong>.
                      </p>

                      {docData.cid && (
                          <p className="text-lg text-justify mb-6 leading-relaxed">
                              <strong>CID-10:</strong> {docData.cid}
                          </p>
                      )}

                      {docData.obs && (
                          <p className="text-lg text-justify mb-6 leading-relaxed bg-slate-50 p-4 border border-slate-200 italic">
                              "{docData.obs}"
                          </p>
                      )}

                      <p className="text-right mt-16 mb-24">São Paulo, {todayFull}</p>

                      <div className="text-center w-2/3 mx-auto">
                          <div className="border-t border-slate-800 pt-2">
                              <p className="font-bold text-lg">{professional.name}</p>
                              <p className="text-sm">CRP: {professional.registrationNumber}</p>
                          </div>
                      </div>
                  </div>
              );

          case 'declaration':
              return (
                  <div className="text-slate-900">
                      <h2 className="text-2xl font-bold text-center mb-10 uppercase tracking-widest">Declaração de Comparecimento</h2>
                      
                      <p className="text-lg text-justify mb-8 leading-relaxed">
                          Declaramos para os devidos fins de comprovação que <strong>{patient.name}</strong>, 
                          portador(a) do CPF nº <strong>{patient.cpf || '___.___.___-__'}</strong>, compareceu a este serviço de psicologia 
                          para atendimento no dia <strong>{formatDate(docData.date)}</strong>.
                      </p>

                      <p className="text-right mt-16 mb-24">São Paulo, {todayFull}</p>

                      <div className="text-center w-2/3 mx-auto">
                          <div className="border-t border-slate-800 pt-2">
                              <p className="font-bold text-lg">{professional.name}</p>
                              <p className="text-sm">CRP: {professional.registrationNumber}</p>
                              <p className="text-sm">{professional.email}</p>
                          </div>
                      </div>
                  </div>
              );
            
          case 'hours':
                return (
                    <div className="text-slate-900">
                        <h2 className="text-2xl font-bold text-center mb-10 uppercase tracking-widest">Declaração de Horas</h2>
                        
                        <p className="text-lg text-justify mb-8 leading-relaxed">
                            Declaro para fins de estágio/trabalho que <strong>{patient.name}</strong> realizou 
                            acompanhamento psicológico neste consultório, totalizando <strong>{docData.hours} horas</strong> 
                            no período de <strong>{formatDate(docData.periodStart)}</strong> a <strong>{formatDate(docData.periodEnd)}</strong>.
                        </p>
  
                        <p className="text-right mt-16 mb-24">São Paulo, {todayFull}</p>
  
                        <div className="text-center w-2/3 mx-auto">
                            <div className="border-t border-slate-800 pt-2">
                                <p className="font-bold text-lg">{professional.name}</p>
                                <p className="text-sm">CRP: {professional.registrationNumber}</p>
                            </div>
                        </div>
                    </div>
                );
      }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6 animate-[fadeIn_0.5s_ease-out] font-sans pb-10">
        
        {/* LEFT: CONFIGURATION PANEL */}
        <div className="w-full lg:w-[400px] bg-white rounded-[24px] border border-slate-200 shadow-xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h2 className="font-display font-bold text-xl text-slate-800 flex items-center gap-2">
                    <FileText className="text-indigo-600" /> {t('docGen.title')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{t('docGen.subtitle')}</p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                
                {/* 1. Patient Selection */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('docGen.selectPatient')}</label>
                    <div className="relative">
                        <select 
                            className="w-full p-3 pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                            value={selectedPatientId}
                            onChange={(e) => setSelectedPatientId(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {MOCK_PATIENTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>
                </div>

                {/* 2. Document Type */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('docGen.docType')}</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: 'receipt', label: 'Recibo', icon: <Receipt size={16}/> },
                            { id: 'attestation', label: 'Atestado', icon: <BadgeCheck size={16}/> },
                            { id: 'declaration', label: 'Declaração', icon: <FileCheck size={16}/> },
                            { id: 'hours', label: 'Horas', icon: <Clock size={16}/> },
                        ].map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setDocType(type.id as any)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${docType === type.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                {type.icon}
                                <span className="text-xs font-bold mt-1">{type.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Dynamic Fields */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800">{t('docGen.config')}</h3>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">{t('docGen.field.date')}</label>
                        <input 
                            type="date" 
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                            value={docData.date}
                            onChange={e => setDocData({...docData, date: e.target.value})}
                        />
                    </div>

                    {docType === 'receipt' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">{t('docGen.field.value')}</label>
                                    <div className="relative">
                                        <input type="number" className="w-full pl-7 p-2 border border-slate-200 rounded-lg text-sm" value={docData.value} onChange={e => setDocData({...docData, value: parseFloat(e.target.value)})} />
                                        <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">{t('docGen.field.sessions')}</label>
                                    <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={docData.sessions} onChange={e => setDocData({...docData, sessions: parseInt(e.target.value)})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Descrição</label>
                                <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={docData.description} onChange={e => setDocData({...docData, description: e.target.value})} />
                            </div>
                        </>
                    )}

                    {docType === 'attestation' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">{t('docGen.field.cid')}</label>
                                <div className="relative">
                                    <input type="text" className="w-full pl-7 p-2 border border-slate-200 rounded-lg text-sm" placeholder="F41.1" value={docData.cid} onChange={e => setDocData({...docData, cid: e.target.value})} />
                                    <Hash size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle size={10} /> {t('docGen.warning.cid')}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">{t('docGen.field.obs')}</label>
                                <textarea rows={3} className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" value={docData.obs} onChange={e => setDocData({...docData, obs: e.target.value})} placeholder="Recomendação de afastamento..." />
                            </div>
                        </>
                    )}

                    {docType === 'hours' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Início</label>
                                    <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={docData.periodStart} onChange={e => setDocData({...docData, periodStart: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Fim</label>
                                    <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={docData.periodEnd} onChange={e => setDocData({...docData, periodEnd: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Total de Horas</label>
                                <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={docData.hours} onChange={e => setDocData({...docData, hours: parseInt(e.target.value)})} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
                <button 
                    onClick={handlePrint}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                    <Printer size={18} /> {t('docGen.print')}
                </button>
            </div>
        </div>

        {/* RIGHT: PREVIEW PANEL (A4 Simulation) */}
        <div className="flex-1 bg-slate-800/50 rounded-[24px] border border-slate-200/50 p-8 overflow-y-auto flex justify-center backdrop-blur-sm">
            <div 
                id="a4-preview"
                className="bg-white w-full max-w-[210mm] min-h-[297mm] p-[20mm] shadow-2xl relative"
            >
                {/* Header (Professional Logo/Info) */}
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-6 mb-8">
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-widest text-slate-900">{professional.name}</h1>
                        <p className="text-sm text-slate-600 font-serif italic">{professional.profession}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                        <p>{professional.email}</p>
                        <p>{professional.phone}</p>
                        <p>São Paulo - SP</p>
                    </div>
                </div>

                {/* Content */}
                <div className="font-serif leading-relaxed text-slate-800 min-h-[500px]">
                    {renderDocumentContent()}
                </div>

                {/* Footer (Watermark/System Info) */}
                <div className="absolute bottom-10 left-0 w-full text-center text-[10px] text-slate-300 uppercase tracking-widest pointer-events-none no-print">
                    Gerado via PsiManager Pro • Autenticidade Digital
                </div>
            </div>
        </div>

    </div>
  );
};
