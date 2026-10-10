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
  Info,
  Sparkles,
  Edit3,
  Settings,
  CheckCircle2,
  ChevronRight,
  Trash2,
  Briefcase,
  UploadCloud,
  History,
  MapPin,
  Stethoscope,
  Eye
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Combobox } from '../components/UI/Combobox';
import { RichTextEditor } from '../components/UI/RichTextEditor';
import {
  Alert, Badge, Button, ConfirmModal, DatePicker, EmptyState, FilterLineSearch, FormRow, IconButton,
  Input, Modal, ModalFooter, PageWrapper, PanelCard, SectionTitle, Select, Tabs
} from '../components/UI';

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

const docTabs = [
  { id: 'modelo', label: 'Modelo', icon: FileText },
  { id: 'dados', label: 'Dados do documento', icon: User },
  { id: 'timbrado', label: 'Papel timbrado', icon: ImageIcon },
] as const;

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
      clinicName: '',
      phone: '',
      address: '',
      email: ''
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
  const [activeTab, setActiveTab] = useState<typeof docTabs[number]['id']>('modelo');
  const [templateSearch, setTemplateSearch] = useState('');

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
  const [templateToDelete, setTemplateToDelete] = useState<DocTemplate | null>(null);
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
              clinicName: profileData.company_name || '',
              phone: profileData.phone || '',
              address: profileData.address || '',
              email: profileData.email || ''
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
                // Se não tiver categoria, mostra por padrão ou se o título bater
                if (!t.category_id) return true;
                
                const cat = categories.find(c => String(c.id) === String(t.category_id));
                const catName = cat?.name.toLowerCase() || '';
                const title = t.title.toLowerCase();
                
                return catName.includes(areaLabel) || 
                       title.includes(areaLabel) || 
                       catName.includes('relatórios') || 
                       catName.includes('encaminhamento') || 
                       catName.includes('financeiro') || 
                       catName.includes('oficiais') ||
                       title.includes('encaminhamento') ||
                       title.includes('recibo') ||
                       title.includes('atestado');
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
    return categories.filter(c => {
      const name = c.name.toLowerCase();
      return name.includes(areaLabel) || 
             name.includes('relatórios') || 
             name.includes('encaminhamento') || 
             name.includes('financeiro') || 
             name.includes('oficiais');
    });
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
        formData.append('file', file);
        formData.append('category', 'Papel Timbrado');
        formData.append('title', target === 'header' ? 'Logo Cabeçalho' : 'Logo Rodapé');
        
        const resp = await api.request<any>('/uploads', {
            method: 'POST',
            body: formData
        });
        
        const url = getStaticUrl(resp.file_url || resp.url);
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
      <style>
        span[contenteditable="false"] { 
          background: transparent !important; 
          color: inherit !important; 
          border: none !important; 
          padding: 0 !important; 
          margin: 0 !important; 
          font-size: inherit !important; 
          font-weight: inherit !important;
          display: inline !important;
          vertical-align: baseline !important;
        }
        span[contenteditable="false"] svg { display: none !important; }
      </style>
      <div style="font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px 60px; line-height: 1.5; background: white; min-height: 29.7cm; width: 21cm; margin: 0 auto; box-shadow: 0 0 20px rgba(0,0,0,0.05); position: relative; box-sizing: border-box; display: flex; flex-direction: column;">
        
        <!-- HEADER: CLINIC STYLE -->
        <div style="display: flex; align-items: center; margin-bottom: 50px; border-bottom: 3px solid #6366f1; padding-bottom: 30px;">
           ${hLogo ? `<div style="flex-shrink: 0; margin-right: 35px; display: flex; align-items: center; justify-content: center; width: 120px; height: 120px; background: #f8fafc; border-radius: 20px;"><img src="${hLogo}" style="max-height: 100px; max-width: 100px; object-fit: contain;" /></div>` : ''}
           
           <div style="flex: 1; ${hLogo ? 'border-left: 1px solid #e2e8f0; padding-left: 35px;' : ''} display: flex; flex-direction: column; justify-content: center;">
              <h1 style="margin: 0; font-size: 18pt; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; line-height: 1.1;">${professionalData.name}</h1>
              <p style="margin: 6px 0; font-size: 10pt; font-weight: 700; color: #6366f1; text-transform: ; letter-spacing: 0.15em;">${professionalData.specialty || 'Profissional'} <span style="margin: 0 8px; color: #cbd5e1; font-weight: 300;">|</span> CRP ${professionalData.crp || ''}</p>
              
              <div style="margin-top: 12px; font-size: 8.5pt; color: #64748b; line-height: 1.6; font-weight: 500;">
                ${professionalData.address ? `<div style="display: flex; align-items: center; gap: 6px;">${professionalData.address}</div>` : ''}
                <div style="display: flex; gap: 15px; margin-top: 2px;">
                  ${professionalData.phone ? `<span><b>Tel:</b> ${professionalData.phone}</span>` : ''}
                  ${professionalData.email ? `<span><b>Email:</b> ${professionalData.email}</span>` : ''}
                </div>
              </div>
           </div>
        </div>

        <div style="flex: 1; font-size: 11.5pt; text-align: justify; color: #334155; letter-spacing: -0.01em;">
          <div class="document-content">${body}</div>
        </div>

        <div style="margin-top: 60px; display: flex; flex-direction: column; align-items: center; text-align: center; page-break-inside: avoid;">
            <div style="width: 240px; border-top: 1px solid #cbd5e1; margin-bottom: 10px;"></div>
            <p style="font-weight: 800; margin: 0; font-size: 10pt; color: #0f172a; text-transform: ; letter-spacing: 0.05em;">${sName}</p>
            <p style="margin: 0; font-size: 8.5pt; color: #64748b; font-weight: 600;">${selectedArea.toUpperCase()}: ${sCrp}</p>
        </div>

        ${fLogo ? `<div style="margin-top: 40px; text-align: center;"><img src="${fLogo}" style="max-height: 60px; max-width: 80%; object-fit: contain;" /></div>` : ''}
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
        pushToast('success', 'Template atualizado com sucesso!');
      } else {
        const resp = await api.post<any>('/doc-generator/doc-templates', payload);
        if (resp && resp.id) {
          setSelectedTemplateId(String(resp.id));
        }
        pushToast('success', 'Novo template criado com sucesso!');
      }
      setIsTemplateModalOpen(false);
      await fetchData();
    } catch (e) {
      console.error(e);
      pushToast('error', 'Erro ao salvar o template.');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      await api.delete(`/doc-generator/doc-templates/${templateToDelete.id}`);
      setTemplateToDelete(null);
      if (selectedTemplateId === templateToDelete.id) {
        setSelectedTemplateId('');
      }
      await fetchData();
      pushToast('success', 'Template excluído com sucesso!');
    } catch (e) {
      console.error(e);
      pushToast('error', 'Erro ao excluir template.');
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

      pushToast('success', 'Documento gerado e salvo no histórico!');

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
      pushToast('error', 'Erro ao gerar ou salvar o documento.');
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

  const areaRegistry = selectedArea === 'psicologia' ? 'CRP' : selectedArea === 'medicina' ? 'CRM' : selectedArea === 'psicopedagogia' ? 'ABPp' : selectedArea === 'enfermagem' ? 'COREN' : 'CREFITO';

  const categoryNameOf = (id?: string | null) => categories.find(c => String(c.id) === String(id || ''))?.name || '';

  const visibleTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return filteredTemplates;
    return filteredTemplates.filter(tpl =>
      tpl.title.toLowerCase().includes(q) ||
      (tpl.doc_type || '').toLowerCase().includes(q) ||
      categoryNameOf(tpl.category_id).toLowerCase().includes(q)
    );
  }, [filteredTemplates, templateSearch, categories]);

  const openPreview = async () => {
    await renderPreview();
    setIsPreviewModalOpen(true);
  };

  const renderUploadBox = (
    label: string,
    url: string,
    setUrl: (v: string) => void,
    inputRef: React.MutableRefObject<HTMLInputElement | null>,
    target: 'header' | 'footer'
  ) => (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-slate-600">{label}</span>
      <div className="flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-3 text-center">
        {url ? (
          <img src={url} alt={label} className="max-h-20 max-w-full object-contain" />
        ) : (
          <>
            <UploadCloud size={18} className="text-slate-400" />
            <p className="text-xs text-slate-500">Envie uma imagem (PNG ou JPG).</p>
          </>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="xs"
            iconLeft={<UploadCloud size={14} />}
            onClick={() => inputRef.current?.click()}
            disabled={uploadingTarget === target}
          >
            {url ? 'Trocar imagem' : 'Selecionar imagem'}
          </Button>
          {url && (
            <IconButton
              variant="ghost"
              size="xs"
              aria-label={`Remover ${label.toLowerCase()}`}
              title="Remover"
              onClick={() => setUrl('')}
            >
              <Trash2 size={14} />
            </IconButton>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleLogoFile(e, target)} />
      </div>
    </div>
  );

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={FileText}
          title="Encaminhamentos"
          description="Gere encaminhamentos, laudos, atestados e declarações a partir de modelos."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setIsConfirmSeedModalOpen(true)}
                disabled={isSeeding}
                variant="outline"
                size="sm"
                iconLeft={<Sparkles size={14} />}
              >
                {isSeeding ? 'Importando...' : 'Importar padrões'}
              </Button>
              <Button
                onClick={() => setIsCategoryModalOpen(true)}
                variant="outline"
                size="sm"
                iconLeft={<Settings size={14} />}
              >
                Categorias
              </Button>
              <Button
                onClick={() => openTemplateModal()}
                variant="outline"
                size="sm"
                iconLeft={<Plus size={14} />}
              >
                Novo template
              </Button>
              <Button
                onClick={openPreview}
                disabled={!selectedTemplateId || isRendering}
                variant="outline"
                size="sm"
                iconLeft={isRendering ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              >
                Visualizar
              </Button>
              <Button
                onClick={handleGeneratePdf}
                disabled={!previewHtml || !selectedTemplateId || isRendering}
                variant="primary"
                size="sm"
                iconLeft={<Printer size={14} />}
              >
                Imprimir
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" /> Carregando...
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Coluna esquerda: formulário em abas */}
          <div className="min-w-0">
            <Tabs<typeof docTabs[number]['id']> items={docTabs} value={activeTab} onChange={setActiveTab} label="Configuração do documento">
              {activeTab === 'modelo' && (
                <div className="space-y-3">
                  <PanelCard title="Área e categoria" icon={History}>
                    <FormRow cols={2}>
                      <Select
                        label="Área de atuação"
                        value={selectedArea}
                        onChange={e => {
                          setSelectedArea(e.target.value);
                          setSelectedCategoryId('');
                          setSelectedTemplateId('');
                        }}
                        options={[
                          { value: 'psicologia', label: 'Psicologia (CRP)' },
                          { value: 'medicina', label: 'Medicina (CRM)' },
                          { value: 'psicopedagogia', label: 'Psicopedagogia (ABPp)' },
                          { value: 'enfermagem', label: 'Enfermagem (COREN)' },
                          { value: 'fisioterapia', label: 'Fisioterapia (CREFITO)' },
                        ]}
                      />
                      <Select
                        label="Categoria"
                        value={selectedCategoryId}
                        onChange={e => setSelectedCategoryId(e.target.value)}
                        placeholder="Todas as categorias"
                        options={filteredCategories.map(c => ({ value: c.id, label: c.name }))}
                      />
                    </FormRow>
                  </PanelCard>

                  <PanelCard title="Modelos" description={`${visibleTemplates.length} disponíveis`}>
                    <div className="space-y-3">
                      <FilterLineSearch
                        value={templateSearch}
                        onChange={setTemplateSearch}
                        placeholder="Buscar modelo..."
                        className="max-w-[280px]"
                      />
                      {visibleTemplates.length === 0 ? (
                        <EmptyState
                          icon={FileText}
                          title="Nenhum template encontrado"
                          description={templateSearch ? 'Ajuste a busca ou os filtros.' : 'Importe os padrões ou crie um novo template.'}
                        />
                      ) : (
                        <div className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-3">
                          {visibleTemplates.map(tpl => {
                            const active = selectedTemplateId === tpl.id;
                            return (
                              <div
                                key={tpl.id}
                                className={`relative rounded-lg border p-3 transition-colors ${
                                  active ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-primary-300'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedTemplateId(tpl.id)}
                                  className="block w-full text-left"
                                  aria-pressed={active}
                                >
                                  <p className="line-clamp-2 pr-14 text-[13px] font-medium leading-snug text-slate-800">{tpl.title}</p>
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <Badge color={active ? 'primary' : 'default'} size="sm">{tpl.doc_type || 'Geral'}</Badge>
                                    {categoryNameOf(tpl.category_id) && (
                                      <span className="text-[11px] text-slate-500">{categoryNameOf(tpl.category_id)}</span>
                                    )}
                                  </div>
                                </button>
                                <div className="absolute right-2 top-2 flex gap-0.5">
                                  <IconButton
                                    variant="ghost"
                                    size="xs"
                                    aria-label="Editar template"
                                    title="Editar Template"
                                    onClick={() => openTemplateModal(tpl)}
                                  >
                                    <Edit3 size={14} />
                                  </IconButton>
                                  <IconButton
                                    variant="ghost"
                                    size="xs"
                                    aria-label="Excluir template"
                                    title="Excluir Template"
                                    onClick={() => setTemplateToDelete(tpl)}
                                  >
                                    <Trash2 size={14} />
                                  </IconButton>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </PanelCard>
                </div>
              )}

              {activeTab === 'dados' && (
                <div className="space-y-3">
                  <PanelCard title="Paciente e documento" icon={User}>
                    <div className="space-y-3">
                      <FormRow cols={2}>
                        <Combobox
                          label="Paciente"
                          value={selectedPatientId}
                          onChange={(v) => {
                            const val = v as string;
                            setSelectedPatientId(val);
                            const p = patients.find(pt => String(pt.id) === val);
                            if (p) setPatientName(p.name || p.full_name || '');
                          }}
                          placeholder="Selecione um paciente..."
                          options={patients.map(p => ({ value: String(p.id), label: p.name || p.full_name || '' }))}
                          icon={<User size={16} />}
                        />
                        <Input
                          label="Nome manual/extra"
                          placeholder="Nome do paciente"
                          value={patientName}
                          onChange={e => setPatientName(e.target.value)}
                        />
                      </FormRow>
                      <FormRow cols={2}>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-slate-600">Data do documento</label>
                          <DatePicker value={docDate} onChange={v => setDocDate(v || '')} />
                        </div>
                        <Input
                          label="Cidade"
                          placeholder="Cidade"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                        />
                      </FormRow>
                      {(hasTag('time_start') || hasTag('time_end')) && (
                        <FormRow cols={2}>
                          {hasTag('time_start') && (
                            <Input
                              label="Horário de início"
                              placeholder="08:00"
                              value={timeStart}
                              onChange={e => setTimeStart(e.target.value)}
                            />
                          )}
                          {hasTag('time_end') && (
                            <Input
                              label="Horário de fim"
                              placeholder="09:00"
                              value={timeEnd}
                              onChange={e => setTimeEnd(e.target.value)}
                            />
                          )}
                        </FormRow>
                      )}
                      {hasTag('amount') && (
                        <FormRow cols={2}>
                          <Input
                            label="Valor (R$)"
                            placeholder="0,00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                          />
                          <Input
                            label="Valor por extenso"
                            placeholder="Cento e vinte reais"
                            value={amountText}
                            onChange={e => setAmountText(e.target.value)}
                          />
                        </FormRow>
                      )}
                      {hasTag('service_name') && (
                        <Input
                          label="Serviço / finalidade"
                          placeholder="Ex: Consulta de Psicopedagogia"
                          value={serviceName}
                          onChange={e => setServiceName(e.target.value)}
                        />
                      )}
                    </div>
                  </PanelCard>

                  <PanelCard title="Identidade profissional" icon={Briefcase}>
                    <FormRow cols={2}>
                      <Input
                        label="Nome do profissional"
                        leftIcon={<Briefcase size={14} />}
                        value={professionalName}
                        onChange={e => setProfessionalName(e.target.value)}
                      />
                      <Input
                        label={`Registro (${areaRegistry})`}
                        leftIcon={<CheckCircle2 size={14} />}
                        value={professionalCrp}
                        onChange={e => setProfessionalCrp(e.target.value)}
                      />
                    </FormRow>
                  </PanelCard>
                </div>
              )}

              {activeTab === 'timbrado' && (
                <PanelCard title="Papel timbrado" description="Logotipos usados no cabeçalho e no rodapé do documento." icon={ImageIcon}>
                  <div className="space-y-3">
                    <FormRow cols={2}>
                      {renderUploadBox('Cabeçalho', logoUrl, setLogoUrl, headerInputRef, 'header')}
                      {renderUploadBox('Rodapé', footerLogoUrl, setFooterLogoUrl, footerInputRef, 'footer')}
                    </FormRow>
                    {uploadingTarget && (
                      <div className="flex items-center gap-2 text-[11px] font-medium text-primary-600">
                        <Loader2 className="animate-spin" size={14} /> Enviando imagem...
                      </div>
                    )}
                    {uploadError && <Alert variant="error">{uploadError}</Alert>}
                  </div>
                </PanelCard>
              )}
            </Tabs>
          </div>

          {/* Coluna direita: pré-visualização */}
          <div className="min-w-0">
            <PanelCard
              title="Pré-visualização"
              description={selectedTemplate?.title}
              icon={Eye}
              action={
                <Button variant="outline" size="xs" onClick={openPreview} disabled={!selectedTemplateId || isRendering}>
                  Ampliar
                </Button>
              }
            >
              {!selectedTemplateId ? (
                <EmptyState icon={FileText} title="Selecione um modelo" description="Escolha um modelo na aba Modelo para ver o documento." />
              ) : isRendering && !previewHtml ? (
                <div role="status" className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
                  <Loader2 size={16} className="animate-spin" /> Renderizando...
                </div>
              ) : previewHtml ? (
                <div className="max-h-[640px] overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-2">
                  <div style={{ zoom: 0.55 }} className="preview-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
              ) : (
                <EmptyState icon={FileText} title="Não foi possível renderizar" description="Confira os dados e tente novamente." />
              )}
            </PanelCard>
          </div>
        </div>
        )}
      </div>

      {/* Toasts */}
      <div className="fixed bottom-6 right-4 z-[200] flex flex-col gap-2">
        {toasts.map(tt => (
          <div key={tt.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${tt.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {tt.type === 'success' ? <CheckCircle2 size={16} /> : <Info size={16} />}
            <span className="text-xs font-medium">{tt.message}</span>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Pré-visualização do documento"
        size="xl"
        footer={
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsPreviewModalOpen(false)}>Fechar</Button>
            <Button variant="primary" iconLeft={<Printer size={14} />} onClick={handleGeneratePdf} disabled={!previewHtml || isRendering}>Imprimir</Button>
          </ModalFooter>
        }
      >
        <div className="flex flex-col items-center overflow-x-auto rounded-lg bg-slate-100 p-3">
          <div className="mb-3 flex w-full max-w-[210mm] items-center gap-2 text-xs text-slate-600">
            <span className={`h-2 w-2 rounded-full ${previewHtml ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {isRendering ? 'Renderizando...' : previewHtml ? 'Pré-visualização digital' : 'Erro na renderização'}
          </div>
          <div className="w-full max-w-[210mm] bg-white">
            {previewHtml ? (
              <div className="preview-content w-full" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <EmptyState icon={FileText} title="Documento vazio" />
            )}
          </div>
        </div>
      </Modal>

      {/* Categorias */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Categorias de documentos"
        size="md"
        footer={<ModalFooter><Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>Fechar</Button></ModalFooter>}
      >
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <Input
              label="Nova categoria"
              placeholder="Nome da categoria"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              wrapperClassName="flex-1"
            />
            <Button variant="primary" iconLeft={<Plus size={14} />} onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
              Adicionar
            </Button>
          </div>
          {categories.length === 0 ? (
            <EmptyState icon={Settings} title="Nenhuma categoria" />
          ) : (
            <ul className="max-h-60 space-y-2 overflow-y-auto">
              {categories.map(c => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <span className="text-xs font-medium text-slate-700">{c.name}</span>
                  <IconButton
                    variant="ghost"
                    size="xs"
                    aria-label={`Excluir categoria ${c.name}`}
                    onClick={async () => {
                      if (window.confirm('Deseja excluir esta categoria?')) {
                        await api.request(`/doc-generator/doc-categories/${c.id}`, { method: 'DELETE' });
                        await fetchData();
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isConfirmSeedModalOpen}
        onClose={() => setIsConfirmSeedModalOpen(false)}
        onConfirm={handleSeedDefaults}
        title="Importar modelos padrão"
        message="Isso adicionará modelos de Atestado, Declaração, Recibo e Relatórios pré-configurados. Seus modelos atuais não serão alterados."
        confirmLabel="Importar"
        variant="primary"
      />

      {/* Modelo (criar/editar) */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title={editingTemplateId ? 'Editar modelo' : 'Criar novo modelo'}
        size="xl"
        footer={
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>Descartar</Button>
            <Button variant="primary" iconLeft={<Save size={14} />} onClick={saveTemplate}>Salvar template</Button>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <FormRow cols={3}>
            <Input
              label="Título do documento"
              value={templateTitle}
              onChange={e => setTemplateTitle(e.target.value)}
              placeholder="Ex: Laudo Psicológico"
            />
            <Select
              label="Categoria"
              value={templateCategoryId}
              onChange={e => setTemplateCategoryId(e.target.value)}
              placeholder="Sem categoria"
              options={categories.map(c => ({ value: c.id, label: c.name }))}
            />
            <Select
              label="Tipo de documento"
              value={templateDocType}
              onChange={e => setTemplateDocType(e.target.value)}
              options={[
                { value: 'atestado', label: 'Atestado' },
                { value: 'declaracao', label: 'Declaração' },
                { value: 'encaminhamento', label: 'Encaminhamento' },
                { value: 'recibo', label: 'Recibo' },
                { value: 'prontuario', label: 'Prontuário' },
                { value: 'ficha', label: 'Ficha de Anamnese' },
                { value: 'laudo', label: 'Laudo' },
                { value: 'outros', label: 'Outros' },
              ]}
            />
          </FormRow>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Corpo do template (tags dinâmicas)</label>
            <RichTextEditor
              value={templateBody}
              onChange={setTemplateBody}
              placeholder="Escreva o texto do documento aqui, use as variáveis no menu acima..."
              minHeight={400}
            />
          </div>

          <PanelCard title="Assinatura do template" icon={CheckCircle2}>
            <FormRow cols={2}>
              <Input
                label="Assinado por (nome)"
                value={templateSignatureName}
                onChange={e => setTemplateSignatureName(e.target.value)}
              />
              <Input
                label="Reg. profissional (ex: CRP/CRM)"
                value={templateSignatureCrp}
                onChange={e => setTemplateSignatureCrp(e.target.value)}
              />
            </FormRow>
          </PanelCard>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={handleDeleteTemplate}
        title="Excluir modelo"
        message={<>Você está prestes a excluir o modelo <span className="font-medium text-slate-800">"{templateToDelete?.title}"</span>. Esta ação não pode ser desfeita.</>}
        confirmLabel="Excluir"
        variant="danger"
      />
    </PageWrapper>
  );
};
