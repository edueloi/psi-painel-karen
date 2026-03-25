import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getStaticUrl } from '../services/api';
import { Patient } from '../types';
import {
  FileText,
  Printer,
  User,
  Calendar,
  Clock,
  Loader2,
  Plus,
  Save,
  X,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
  ChevronRight,
  Settings,
  History,
  CheckCircle2,
  Briefcase,
  MapPin,
  Stethoscope,
  Info,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Modal } from '../components/UI/Modal';
import { Input, Select, TextArea } from '../components/UI/Input';
import { PageHeader } from '../components/UI/PageHeader';
import { RichTextEditor } from '../components/UI/RichTextEditor';
import { title } from 'process';

type DocCategory = {
  id: string;
  name: string;
};

type DocTemplate = {
  id: string;
  category_id?: string | null;
  title: string;
  doc_type?: string | null;
  template_body: string;
  header_logo_url?: string | null;
  footer_logo_url?: string | null;
  signature_name?: string | null;
  signature_crp?: string | null;
};

type UploadItem = {
  id: string;
  file_name?: string | null;
  file_type?: string | null;
  file_url?: string | null;
};

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatDate = (value: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const DocGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  // States initialized from searchParams
  const [selectedPatientId, setSelectedPatientId] = useState<string>(searchParams.get('patient_id') || '');
  const [patientName, setPatientName] = useState('');
  const [docDate, setDocDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [timeStart, setTimeStart] = useState(searchParams.get('time_start') || '');
  const [timeEnd, setTimeEnd] = useState(searchParams.get('time_end') || '');
  const [serviceName, setServiceName] = useState(searchParams.get('service_name') || '');
  const [amount, setAmount] = useState(searchParams.get('amount') || '');
  const [logoUrl, setLogoUrl] = useState('');
  const [footerLogoUrl, setFooterLogoUrl] = useState('');

  // Professional / Clinic Data
  const [professionalData, setProfessionalData] = useState({
      name: '',
      crp: '',
      specialty: '',
      clinicLogo: '',
      city: '',
      clinicName: ''
  });
  const [professionalName, setProfessionalName] = useState('');
  const [professionalCrp, setProfessionalCrp] = useState('');
  const [city, setCity] = useState('');

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('psicologia');
  const [amountText, setAmountText] = useState('');

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateCategoryId, setTemplateCategoryId] = useState<string>('');
  const [templateDocType, setTemplateDocType] = useState('outros');
  const [templateHeaderLogo, setTemplateHeaderLogo] = useState('');
  const [templateFooterLogo, setTemplateFooterLogo] = useState('');
  const [templateSignatureName, setTemplateSignatureName] = useState('');
  const [templateSignatureCrp, setTemplateSignatureCrp] = useState('');
  const [isConfirmSeedModalOpen, setIsConfirmSeedModalOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; type: 'success' | 'error'; message: string }[]>([]);

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const headerInputRef = useRef<HTMLInputElement | null>(null);
  const footerInputRef = useRef<HTMLInputElement | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [patientsData, categoriesData, templatesData, uploadsData, profileData] = await Promise.all([
        api.get<Patient[]>('/patients'),
        api.get<any[]>('/doc-generator/doc-categories'),
        api.get<any[]>('/doc-generator/doc-templates'),
        api.get<any[]>('/uploads'),
        api.get<any>('/profile/me')
      ]);
      
      setPatients(patientsData);
      setCategories((categoriesData || []).map((c: any) => ({ id: String(c.id), name: c.name })));
      setTemplates((templatesData || []).map((t: any) => ({
        id: String(t.id),
        category_id: t.category_id ? String(t.category_id) : null,
        title: t.title,
        doc_type: t.doc_type,
        template_body: t.template_body,
        header_logo_url: t.header_logo_url,
        footer_logo_url: t.footer_logo_url,
        signature_name: t.signature_name,
        signature_crp: t.signature_crp
      })));
      setUploads((uploadsData || []).map((u: any) => ({
        id: String(u.id),
        file_name: u.file_name,
        file_type: u.file_type,
        file_url: u.file_url
      })));

      if (profileData) {
          setProfessionalData({
              name: profileData.name || '',
              crp: profileData.crp || '',
              specialty: profileData.specialty || '',
              clinicLogo: profileData.clinic_logo_url || '',
              city: (profileData.address || '').split(',').pop()?.trim() || '',
              clinicName: profileData.company_name || ''
          });
          setProfessionalName(profileData.name || '');
          setProfessionalCrp(profileData.crp || '');
          if (!city) setCity((profileData.address || '').split(',').pop()?.trim() || '');
          if (profileData.clinic_logo_url) setLogoUrl(getStaticUrl(profileData.clinic_logo_url));
      }

      // If we have a patient_id in URL, find the name immediately
      if (searchParams.get('patient_id')) {
          const pt = patientsData.find((p: any) => String(p.id) === String(searchParams.get('patient_id')));
          if (pt) setPatientName(pt.name || pt.full_name || '');
      }

      // Auto-select receipt template if we have service info
      if (searchParams.get('service_name')) {
        const receiptTpl = templatesData.find((t: any) => t.title.toLowerCase().includes('recibo'));
        if (receiptTpl) setSelectedTemplateId(String(receiptTpl.id));
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const patient = useMemo(
    () => patients.find(p => String(p.id) === selectedPatientId),
    [patients, selectedPatientId]
  );

  const filteredTemplates = useMemo(() => {
    let tpls = templates;
    if (selectedArea) {
        const areaLabel = selectedArea.toLowerCase();
        if (selectedCategoryId) {
            tpls = tpls.filter(t => String(t.category_id || '') === String(selectedCategoryId));
        } else {
            tpls = tpls.filter(t => {
                const cat = categories.find(c => String(c.id) === String(t.category_id));
                const catName = cat?.name.toLowerCase() || '';
                return catName.includes(areaLabel) || t.title.toLowerCase().includes(areaLabel) || catName.includes('relatórios');
            });
        }
    } else if (selectedCategoryId) {
        tpls = tpls.filter(t => String(t.category_id || '') === String(selectedCategoryId));
    }
    return tpls;
  }, [templates, selectedCategoryId, selectedArea, categories]);

  const filteredCategories = useMemo(() => {
    if (!selectedArea) return categories;
    const areaLabel = selectedArea.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(areaLabel) || c.name.toLowerCase().includes('relatórios'));
  }, [categories, selectedArea]);

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const imageUploads = useMemo(
    () => uploads.filter(u => (u.file_type || '').startsWith('image/') && u.file_url),
    [uploads]
  );

  const hasTag = (tag: string) => {
    if (!selectedTemplate) return true; // Mostrar todos se nenhum template selecionado
    return selectedTemplate.template_body.includes(`{{${tag}}}`);
  };

  const uploadImage = async (file: File, target: 'header' | 'footer') => {
    setUploadingTarget(target);
    try {
        const formData = new FormData();
        formData.append(target === 'header' ? 'logo' : 'footer', file); // Adjust to whatever endpoint expects
        
        // Simpler: use the profile logo endpoint as a shortcut or the general bucket
        const endpoint = target === 'header' ? '/profile/logo' : '/profile/logo'; // Reusing for now
        const resp = await api.request<any>(endpoint, {
            method: 'POST',
            body: formData
        });
        const url = getStaticUrl(resp.logo_url || resp.file_url);
        if (target === 'header') setLogoUrl(url);
        else setFooterLogoUrl(url);
    } catch (e) {
        console.error(e);
        setUploadError('Erro ao enviar imagem');
    } finally {
        setUploadingTarget(null);
    }
  };

  const handleLogoFile = async (event: React.ChangeEvent<HTMLInputElement>, target: 'header' | 'footer') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await uploadImage(file, target);
  };

  const buildData = () => {
    const name = patient?.name || patient?.full_name || patientName.trim();
    const d = new Date(docDate);
    return {
      patient_name: name,
      patient_cpf: patient?.cpf || patient?.cpf_cnpj || '',
      patient_address: patient?.address || '',
      patient_age: patient?.birth_date ? (new Date().getFullYear() - new Date(patient.birth_date).getFullYear()) : '',
      professional_name: professionalName.trim(),
      professional_crp: professionalCrp.trim(),
      date: formatDate(docDate),
      time_start: timeStart,
      time_end: timeEnd,
      service_name: serviceName.trim(),
      amount: amount.trim(),
      amount_text: amountText.trim(),
      city: city.trim(),
      year: Number.isNaN(d.getTime()) ? '' : String(d.getFullYear()),
      month_name: Number.isNaN(d.getTime()) ? '' : monthNames[d.getMonth()] || '',
      header_logo_url: logoUrl || '',
      footer_logo_url: footerLogoUrl || '',
      signature_name: selectedTemplate?.signature_name || professionalName,
      signature_crp: selectedTemplate?.signature_crp || professionalCrp
    };
  };

  const buildHtml = (body: string) => {
    const hLogo = logoUrl || '';
    const fLogo = footerLogoUrl || '';
    const sName = selectedTemplate?.signature_name || professionalName;
    const sCrp = selectedTemplate?.signature_crp || professionalCrp;

    return `
      <div style="font-family: 'Inter', sans-serif; color: #1e293b; padding: 60px 80px; line-height: 1.6; background: white; min-height: 29.7cm; width: 21cm; margin: 0 auto; box-shadow: 0 0 20px rgba(0,0,0,0.05); position: relative; box-sizing: border-box;">
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 60px;">
           ${hLogo ? `<img src="${hLogo}" style="max-height: 120px; max-width: 250px; margin-bottom: 25px; object-fit: contain;" />` : ''}
           <div style="height: 3px; width: 80px; background: #6366f1; border-radius: 4px; margin: 15px 0;"></div>
        </div>

        <div style="min-height: 600px; white-space: pre-wrap; font-size: 11pt; text-align: justify; color: #334155; letter-spacing: -0.01em;">${body}</div>

        <div style="margin-top: 80px; display: flex; flex-direction: column; align-items: center; text-align: center;">
            <div style="width: 280px; border-top: 1px solid #e2e8f0; margin-bottom: 12px;"></div>
            <p style="font-weight: 800; margin: 0; font-size: 10.5pt; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">${sName}</p>
            <p style="margin: 0; font-size: 9pt; color: #64748b; font-weight: 600;">${selectedArea.toUpperCase()}: ${sCrp}</p>
        </div>

        ${fLogo ? `<div style="position: absolute; bottom: 60px; left: 0; right: 0; text-align: center;"><img src="${fLogo}" style="max-height: 80px; max-width: 80%; object-fit: contain;" /></div>` : ''}
      </div>
    `;
  };

  const renderPreview = async () => {
    if (!selectedTemplateId) {
      setPreviewHtml('');
      return;
    }
    setIsRendering(true);
    try {
      const data = buildData();
      const response = await api.post<any>(`/doc-generator/doc-templates/${selectedTemplateId}/render`, {
        patient_id: selectedPatientId || null,
        data
      });
      const body = response.rendered_html || '';
      setPreviewHtml(buildHtml(body));
    } catch (e) {
      console.error(e);
      setPreviewHtml('');
    } finally {
      setIsRendering(false);
    }
  };

  useEffect(() => {
    renderPreview();
  }, [
    selectedTemplateId, selectedPatientId, patientName, professionalName, professionalCrp, docDate, timeStart, timeEnd, serviceName, amount, logoUrl, footerLogoUrl
  ]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await api.post('/doc-generator/doc-categories', { name: newCategoryName.trim() });
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const openTemplateModal = (tpl?: DocTemplate) => {
    if (tpl) {
      setEditingTemplateId(tpl.id);
      setTemplateTitle(tpl.title);
      setTemplateBody(tpl.template_body);
      setTemplateCategoryId(tpl.category_id || '');
      setTemplateDocType(tpl.doc_type || 'outros');
      setTemplateHeaderLogo(tpl.header_logo_url || '');
      setTemplateFooterLogo(tpl.footer_logo_url || '');
      setTemplateSignatureName(tpl.signature_name || '');
      setTemplateSignatureCrp(tpl.signature_crp || '');
    } else {
      setEditingTemplateId(null);
      setTemplateTitle('');
      setTemplateBody('');
      setTemplateCategoryId(selectedCategoryId || '');
      setTemplateDocType('outros');
      setTemplateHeaderLogo('');
      setTemplateFooterLogo('');
      setTemplateSignatureName(professionalName);
      setTemplateSignatureCrp(professionalCrp);
    }
    setIsTemplateModalOpen(true);
  };

  const saveTemplate = async () => {
    if (!templateTitle.trim() || !templateBody.trim()) return;
    const payload = {
      title: templateTitle.trim(),
      category_id: templateCategoryId || null,
      doc_type: templateDocType,
      template_body: templateBody,
      header_logo_url: templateHeaderLogo.trim() || null,
      footer_logo_url: templateFooterLogo.trim() || null,
      signature_name: templateSignatureName.trim() || null,
      signature_crp: templateSignatureCrp.trim() || null
    };

    try {
      if (editingTemplateId) {
        await api.put(`/doc-generator/doc-templates/${editingTemplateId}`, payload);
      } else {
        await api.post('/doc-generator/doc-templates', payload);
      }
      setIsTemplateModalOpen(false);
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleGeneratePdf = async () => {
    if (!selectedTemplateId) return;
    const data = buildData();
    if (!data.patient_name) return;

    try {
      const response = await api.post<any>(`/doc-generator/doc-templates/${selectedTemplateId}/render`, {
        patient_id: selectedPatientId || null,
        data
      });
      const body = response.rendered_html || '';
      const html = buildHtml(body);

      // Save to instance history
      await api.post('/doc-generator/doc-instances', {
        template_id: selectedTemplateId,
        patient_id: selectedPatientId || null,
        title: selectedTemplate?.title || 'Documento',
        rendered_html: html
      });

      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>${selectedTemplate?.title || 'Documento'}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
            <style>
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; }
              .page { position: relative; width: 210mm; height: 297mm; box-sizing: border-box; }
            </style>
          </head>
          <body><div class="page">${html}</div></body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    setIsConfirmSeedModalOpen(false);
    try {
      await api.post('/doc-generator/seed-defaults', {});
      await fetchData();
      pushToast('success', 'Modelos padrão importados com sucesso!');
    } catch (e) {
      console.error(e);
      pushToast('error', 'Erro ao importar modelos padrão.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8">
      {/* TOASTS */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] shadow-2xl border animate-slideIn ${t.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {t.type === 'success' ? <CheckCircle2 size={18}/> : <Info size={18}/>}
            <span className="text-xs font-black uppercase tracking-widest">{t.message}</span>
          </div>
        ))}
      </div>
      <div className="max-w-[1600px] mx-auto px-6 pt-6 mb-6">
        <PageHeader
          icon={<FileText />}
          title="Emissor de Documentos"
          subtitle="Laudos, atestados e prontuários profissionais inteligentes."
          containerClassName="mb-0"
          actions={
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsConfirmSeedModalOpen(true)}
                disabled={isSeeding}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-all border border-emerald-100/50 shadow-sm uppercase tracking-tighter"
              >
                <Sparkles size={14} /> {isSeeding ? 'IMPORTANDO...' : 'IMPORTAR PADRÕES'}
              </button>
              <button 
                onClick={() => setIsCategoryModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm uppercase tracking-tighter"
              >
                <Settings size={14} /> CATEGORIAS
              </button>
              <button
                onClick={() => openTemplateModal()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm uppercase tracking-tighter"
              >
                <Plus size={14} /> NOVO TEMPLATE
              </button>
            </div>
          }
        />
      </div>

      <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
        {/* Left Panel: Configuration */}
        <div className="space-y-4">
           {/* Section 1: Template Selection */}
           <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                        <History size={16} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">1. Configuração de Área</h3>
                </div>
                
                <div className="space-y-4">
                    <Select 
                      label="Área de Atuação"
                      value={selectedArea}
                      onChange={(e) => {
                          setSelectedArea(e.target.value);
                          setSelectedCategoryId('');
                          setSelectedTemplateId('');
                      }}
                    >
                        <option value="psicologia">Psicologia (CRP)</option>
                        <option value="medicina">Medicina (CRM)</option>
                        <option value="psicopedagogia">Psicopedagogia (ABPp)</option>
                        <option value="enfermagem">Enfermagem (COREN)</option>
                        <option value="fisioterapia">Fisioterapia (CREFITO)</option>
                    </Select>
                    
                    <Select 
                      label="Categoria"
                      value={selectedCategoryId} 
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                    >
                        <option value="">Todas as categorias</option>
                        {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredTemplates.length === 0 && (
                            <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                <p className="text-xs font-bold text-slate-400">Nenhum template encontrado.</p>
                            </div>
                        )}
                        {filteredTemplates.map(tpl => (
                            <button
                                key={tpl.id}
                                onClick={() => setSelectedTemplateId(tpl.id)}
                                className={`w-full text-left p-4 rounded-3xl border transition-all flex items-center justify-between group ${
                                    selectedTemplateId === tpl.id 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                    : 'bg-white border-slate-100 hover:border-indigo-300 text-slate-600'
                                }`}
                            >
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tighter leading-none mb-1">{tpl.title}</p>
                                    <span className={`text-[10px] font-bold ${selectedTemplateId === tpl.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                                        {tpl.doc_type || 'Geral'}
                                    </span>
                                </div>
                                <ChevronRight size={16} className={selectedTemplateId === tpl.id ? 'text-white' : 'text-slate-300 group-hover:text-indigo-500'} />
                            </button>
                        ))}
                    </div>
                </div>
           </div>

           {/* Section 2: Document Data */}
           <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                        <User size={16} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">2. Dados do Documento</h3>
                </div>

                <div className="space-y-5">
                    <Select 
                      label="Paciente"
                      icon={<User size={16} />}
                      value={selectedPatientId}
                      onChange={(e) => {
                          setSelectedPatientId(e.target.value);
                          const p = patients.find(pt => String(pt.id) === e.target.value);
                          if (p) {
                              setPatientName(p.name || p.full_name || '');
                          }
                      }}
                    >
                        <option value="">Selecione um paciente...</option>
                        {patients.map(p => <option key={p.id} value={String(p.id)}>{p.name || p.full_name}</option>)}
                    </Select>

                    <Input 
                      label="Nome Manual/Extra"
                      placeholder="Nome do Paciente"
                      value={patientName}
                      onChange={e => setPatientName(e.target.value)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                          label="Data do Doc."
                          type="date"
                          value={docDate}
                          onChange={e => setDocDate(e.target.value)}
                        />
                        <Input 
                          label="Cidade"
                          placeholder="Cidade"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {hasTag('time_start') && (
                         <Input 
                           label="Horário de Início"
                           placeholder="08:00"
                           value={timeStart}
                           onChange={e => setTimeStart(e.target.value)}
                         />
                        )}
                        {hasTag('time_end') && (
                         <Input 
                           label="Horário de Fim"
                           placeholder="09:00"
                           value={timeEnd}
                           onChange={e => setTimeEnd(e.target.value)}
                         />
                        )}
                    </div>

                    {hasTag('amount') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                          label="Valor (R$)"
                          placeholder="0,00"
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                        />
                         <Input 
                           label="Valor por Extenso"
                           placeholder="Cento e vinte reais"
                           value={amountText}
                           onChange={e => setAmountText(e.target.value)}
                         />
                    </div>
                    )}

                    {hasTag('service_name') && (
                    <Input 
                      label="Serviço / Finalidade"
                      placeholder="Ex: Consulta de Psicopedagogia"
                      value={serviceName}
                      onChange={e => setServiceName(e.target.value)}
                    />
                    )}

                    <div className="pt-4 border-t border-slate-50 mt-4 space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">IDENTIDADE PROFISSIONAL</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input 
                              label="Nome do Profissional"
                              icon={<Briefcase size={16} />}
                              value={professionalName}
                              onChange={e => setProfessionalName(e.target.value)}
                            />
                            <Input 
                              label={`Registro (${selectedArea === 'psicologia' ? 'CRP' : selectedArea === 'medicina' ? 'CRM' : selectedArea === 'psicopedagogia' ? 'ABPp' : selectedArea === 'enfermagem' ? 'COREN' : 'CREFITO'})`}
                              icon={<CheckCircle2 size={16} />}
                              value={professionalCrp}
                              onChange={e => setProfessionalCrp(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
           </div>

           {/* Section 3: Visual Identity */}
           <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                            <ImageIcon size={16} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">3. Papel Timbrado</h3>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div 
                      className="group cursor-pointer"
                      onClick={() => headerInputRef.current?.click()}
                    >
                        <div className="h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center group-hover:bg-indigo-50/50 group-hover:border-indigo-200 transition-all overflow-hidden p-2">
                             {logoUrl ? (
                                 <img src={logoUrl} className="max-h-full object-contain" />
                             ) : (
                                 <>
                                    <UploadCloud size={20} className="text-slate-300 group-hover:text-indigo-500 mb-1" />
                                    <span className="text-[9px] font-black text-slate-400 group-hover:text-indigo-600">CABEÇALHO</span>
                                 </>
                             )}
                        </div>
                        <input ref={headerInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleLogoFile(e, 'header')} />
                    </div>

                    <div 
                      className="group cursor-pointer"
                      onClick={() => footerInputRef.current?.click()}
                    >
                        <div className="h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center group-hover:bg-indigo-50/50 group-hover:border-indigo-200 transition-all overflow-hidden p-2">
                             {footerLogoUrl ? (
                                 <img src={footerLogoUrl} className="max-h-full object-contain" />
                             ) : (
                                 <>
                                    <UploadCloud size={20} className="text-slate-300 group-hover:text-indigo-500 mb-1" />
                                    <span className="text-[9px] font-black text-slate-400 group-hover:text-indigo-600">RODAPÉ</span>
                                 </>
                             )}
                        </div>
                        <input ref={footerInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleLogoFile(e, 'footer')} />
                    </div>
                </div>
                {uploadingTarget && (
                    <div className="flex items-center gap-2 mt-4 text-[11px] font-bold text-indigo-600">
                        <Loader2 className="animate-spin" size={14} /> Enviando imagem...
                    </div>
                )}
           </div>

           <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4 pb-10">
                <button 
                  onClick={async () => {
                      await renderPreview();
                      setIsPreviewModalOpen(true);
                  }}
                  disabled={!selectedTemplateId || isRendering}
                  className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] text-sm font-black shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                >
                    {isRendering ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                    VISUALIZAR DOCUMENTO
                </button>

                <button 
                  onClick={handleGeneratePdf}
                  disabled={!previewHtml || !selectedTemplateId || isRendering}
                  className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-emerald-500 text-white rounded-[1.5rem] text-sm font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
                >
                    <Printer size={20} /> IMPRIMIR AGORA
                </button>
           </div>
        </div>
      </div>

      <Modal 
        isOpen={isPreviewModalOpen} 
        onClose={() => setIsPreviewModalOpen(false)}
        title="Pré-visualização do Documento"
        maxWidth="max-w-5xl"
      >
          <div className="bg-slate-900 rounded-[2rem] p-4 md:p-10 flex flex-col items-center min-h-[80vh] overflow-y-auto no-scrollbar relative">
                {/* Print Control Bar */}
                <div className="w-full max-w-[210mm] bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-8 flex items-center justify-between relative z-20">
                    <div className="flex items-center gap-4 px-2">
                         <div className={`w-3 h-3 rounded-full ${previewHtml ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                         <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                            {isRendering ? 'Renderizando...' : previewHtml ? 'Preview Digital' : 'Erro na Renderização'}
                         </p>
                    </div>
                    <button 
                       onClick={handleGeneratePdf}
                       className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[11px] font-black shadow-lg shadow-emerald-500/20 transition-all"
                    >
                       <Printer size={16} /> IMPRIMIR AGORA
                    </button>
                </div>

                {/* A4 Simulator */}
                <div className="w-full max-w-[210mm] bg-white shadow-2xl relative z-10 origin-top transform-gpu transition-all">
                    <div className="w-full overflow-hidden bg-white">
                        {previewHtml ? (
                            <div className="w-full h-full preview-content" dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
                        ) : (
                            <div className="p-20 text-center">
                                <FileText size={64} className="mx-auto text-slate-200 mb-4" />
                                <h4 className="text-xl font-black text-slate-800">Documento Vazio</h4>
                            </div>
                        )}
                    </div>
                </div>
                
                <button 
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="mt-8 px-8 py-3 bg-white/10 text-white rounded-xl text-[10px] font-black hover:bg-white/20 transition-all"
                >
                   FECHAR VISUALIZAÇÃO
                </button>
          </div>
      </Modal>

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <Modal 
          isOpen={isCategoryModalOpen} 
          onClose={() => setIsCategoryModalOpen(false)} 
          title="Categorias de Documentos"
        >
          <div className="space-y-6">
            <div className="flex gap-2">
              <Input 
                placeholder="Nova Categoria" 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
                containerClassName="flex-1"
              />
              <button 
                onClick={handleAddCategory}
                className="px-4 py-2 bg-indigo-600 text-white rounded-2xl text-[11px] font-black hover:bg-indigo-700 transition-all self-end mb-1"
              >
                ADC.
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">{c.name}</span>
                  <button 
                    onClick={async () => {
                      if (window.confirm('Deseja excluir esta categoria?')) {
                        await api.request(`/doc-generator/doc-categories/${c.id}`, { method: 'DELETE' });
                        await fetchData();
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal for Seed Defaults */}
      {isConfirmSeedModalOpen && (
        <Modal 
          isOpen={isConfirmSeedModalOpen} 
          onClose={() => setIsConfirmSeedModalOpen(false)} 
          title="Importar Modelos Padrão"
        >
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Deseja importar os modelos padrão?</h3>
            <p className="text-sm text-slate-500 mb-8">
              Isso adicionará modelos de Atestado, Declaração, Recibo e Relatórios pré-configurados. Seus modelos atuais não serão alterados.
            </p>
            
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setIsConfirmSeedModalOpen(false)}
                className="px-6 py-2.5 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleSeedDefaults}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-xl shadow-emerald-600/20 transition-all font-black text-[11px] uppercase tracking-widest transform active:scale-95"
              >
                SIM, IMPORTAR
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Template Manager Modal */}
      {isTemplateModalOpen && (
        <Modal 
          isOpen={isTemplateModalOpen} 
          onClose={() => setIsTemplateModalOpen(false)} 
          title={editingTemplateId ? "Editar Modelo" : "Criar Novo Modelo"}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Título do Documento" 
                value={templateTitle} 
                onChange={e => setTemplateTitle(e.target.value)} 
                placeholder="Ex: Laudo Psicológico" 
              />
              <Select 
                label="Tipo de Documento" 
                value={templateDocType} 
                onChange={e => setTemplateDocType(e.target.value)}
              >
                <option value="atestado">Atestado</option>
                <option value="declaracao">Declaração</option>
                <option value="recibo">Recibo</option>
                <option value="prontuario">Prontuário</option>
                <option value="ficha">Ficha de Anamnese</option>
                <option value="laudo">Laudo</option>
                <option value="outros">Outros</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Corpo do Template (Tags Dinâmicas)</label>
              <RichTextEditor
                value={templateBody}
                onChange={setTemplateBody}
                placeholder="Escreva o texto do documento aqui, use as variáveis no menu acima..."
                minHeight="400px"
              />
            </div>

            <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
              <h4 className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">
                <CheckCircle2 size={14} /> Assinatura do Template
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Assinado por (Nome)" 
                  value={templateSignatureName} 
                  onChange={e => setTemplateSignatureName(e.target.value)} 
                />
                <Input 
                  label="Reg. Profissional (Ex: CRP/CRM)" 
                  value={templateSignatureCrp} 
                  onChange={e => setTemplateSignatureCrp(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <button 
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-6 py-2.5 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
              >
                DESCARTAR
              </button>
              <button 
                onClick={saveTemplate}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 transition-all font-black text-[11px] uppercase tracking-widest transform active:scale-95 flex items-center gap-2"
              >
                <Save size={18}/> SALVAR TEMPLATE
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
