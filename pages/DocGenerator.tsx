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
  Eye,
  Download
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Combobox } from '../components/UI/Combobox';
import { RichTextEditor } from '../components/UI/RichTextEditor';
import {
  Alert, Badge, Button, ConfirmModal, DatePicker, EmptyState, FilterLineSearch, FormRow, IconButton,
  Input, Modal, ModalFooter, PageWrapper, PanelCard, SectionTitle, Select, Tabs
} from '../components/UI';
import { DocumentPaper } from '../components/Documents/DocumentPaper';
import { renderDocumentPdf, printPdf, pdfFileName } from '../components/Documents/renderDocumentPdf';
import { buildDocumentModel, buildStoredHtml, buildVariableValues } from '../components/Documents/buildDocument';
import { buildIdentity, loadLogoCached, withRegistryLabel } from '../components/Documents/clinicIdentity';
import { amountToWords, applyTemplateVariables, extractCityUf, extractVariables, joinCityUf, labelOfVariable, parseIsoDate, VARIABLE_LABELS } from '../components/Documents/documentVariables';
import type { LogoImage } from '../components/Records/pdf/clinicalDocument';

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
  const [period, setPeriod] = useState(searchParams.get('period') || '');
  const [patientCpfManual, setPatientCpfManual] = useState('');
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<any>(null);
  const [headerLogoImg, setHeaderLogoImg] = useState<LogoImage | null>(null);
  const [footerLogoImg, setFooterLogoImg] = useState<LogoImage | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [emitting, setEmitting] = useState(false);
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
  const [isLoading, setIsLoading] = useState(true);
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
          setProfile(profileData);
          setProfessionalData({
              name: profileData.name || '',
              crp: profileData.crp || '',
              specialty: profileData.specialty || '',
              clinicLogo: profileData.clinic_logo_url || '',
              city: extractCityUf(profileData.address, profileData.city, profileData.state).city,
              clinicName: profileData.company_name || '',
              phone: profileData.phone || '',
              address: profileData.address || '',
              email: profileData.email || ''
          });
          setProfessionalName(profileData.name || '');
          setProfessionalCrp(profileData.crp || '');
          // local do documento = cidade/UF do endereço (nunca o CEP)
          setCity(prev => prev || (() => { const l = extractCityUf(profileData.address, profileData.city, profileData.state); return joinCityUf(l.city, l.state); })());
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

  // variáveis usadas pelo modelo (aliases e {{{ }}} tratados); sem modelo selecionado mostra os campos básicos
  const usedVars = useMemo(() => new Set(selectedTemplate ? extractVariables(selectedTemplate.template_body) : []), [selectedTemplate]);
  const uses = (key: string) => !selectedTemplate || usedVars.has(key);
  const extraKeys = useMemo(() => [...usedVars].filter(k => !(k in VARIABLE_LABELS)), [usedVars]);

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

  const areaRegistry = selectedArea === 'psicologia' ? 'CRP' : selectedArea === 'medicina' ? 'CRM' : selectedArea === 'psicopedagogia' ? 'ABPp' : selectedArea === 'enfermagem' ? 'COREN' : 'CREFITO';

  // logos do papel timbrado (cabeçalho padrão = logo da clínica) carregadas para o PDF
  useEffect(() => {
    let alive = true;
    loadLogoCached(logoUrl).then(l => { if (alive) setHeaderLogoImg(l); });
    return () => { alive = false; };
  }, [logoUrl]);
  useEffect(() => {
    let alive = true;
    loadLogoCached(footerLogoUrl).then(l => { if (alive) setFooterLogoImg(l); });
    return () => { alive = false; };
  }, [footerLogoUrl]);

  const identity = useMemo(() => {
    const idt = buildIdentity(profile || { name: professionalName, crp: professionalCrp }, headerLogoImg);
    idt.clinic.logo = headerLogoImg;
    return idt;
  }, [profile, headerLogoImg, professionalName, professionalCrp]);

  const effectivePatientName = (patient?.name || patient?.full_name || patientName.trim() || '').trim();
  const effectiveCpf = (patientCpfManual.trim() || patient?.cpf || patient?.cpf_cnpj || '').trim();
  const docDateObj = parseIsoDate(docDate) || new Date();
  const professionalRegistry = withRegistryLabel(areaRegistry, professionalCrp.trim());
  const signatureName = (selectedTemplate?.signature_name || '').trim() || professionalName.trim();
  const signatureRegistry = withRegistryLabel(areaRegistry, (selectedTemplate?.signature_crp || '').trim() || professionalCrp.trim());

  // documento = modelo + variáveis (nunca deixa {{ }} no texto; o que faltar fica em `missing`)
  const doc = useMemo(() => {
    if (!selectedTemplate) return null;
    const cityLoc = extractCityUf(city);
    const values = buildVariableValues({
      patientName: effectivePatientName,
      patientCpf: effectiveCpf,
      patientAddress: patient?.address || '',
      patientAge: patient?.birth_date ? new Date().getFullYear() - new Date(patient.birth_date).getFullYear() : '',
      professionalName: professionalName.trim(),
      professionalRegistry: professionalCrp.trim(),
      docDate: docDateObj,
      timeStart, timeEnd, amount, amountText, period, serviceName,
      city: city.trim(), state: cityLoc.state, cityUf: city.trim(),
      clinic: identity.clinic,
      signatureName, signatureRegistry: (selectedTemplate.signature_crp || professionalCrp).trim(),
      extras: extraValues,
    });
    const applied = applyTemplateVariables(selectedTemplate.template_body, values);
    const missing = [...applied.missing];
    if (!effectivePatientName && !missing.includes('patient_name')) missing.unshift('patient_name');
    const model = buildDocumentModel({
      title: selectedTemplate.title,
      docType: selectedTemplate.doc_type,
      bodyHtml: applied.html,
      clinic: identity.clinic,
      professional: { ...identity.professional, name: professionalName.trim() || identity.professional.name, registry: professionalRegistry || identity.professional.registry },
      patient: { name: effectivePatientName, cpf: effectiveCpf, birth: patient?.birth_date ? parseIsoDate(String(patient.birth_date).slice(0, 10))?.toLocaleDateString('pt-BR') : '' },
      docDate: docDateObj,
      place: city.trim(),
      signatureName,
      signatureRegistry,
      footerLogo: footerLogoImg,
    });
    return { model, missing };
  }, [selectedTemplate, effectivePatientName, effectiveCpf, patient, professionalName, professionalCrp, professionalRegistry, docDate, timeStart, timeEnd, amount, amountText, period, serviceName, city, identity, signatureName, signatureRegistry, extraValues, footerLogoImg]);

  const missing = doc?.missing || [];
  const missingLabels = missing.map(labelOfVariable).join(', ');
  const fieldError = (...keys: string[]) => (showErrors && keys.some(k => missing.includes(k)) ? 'Obrigatório' : undefined);

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

  const emitDocument = async (mode: 'print' | 'download') => {
    if (!selectedTemplateId || !doc || emitting) return;
    if (doc.missing.length) {
      setShowErrors(true);
      setActiveTab('dados');
      pushToast('error', `Preencha: ${missingLabels}`);
      return;
    }
    setEmitting(true);
    try {
      const model = { ...doc.model, emittedAt: new Date() };
      const pdf = renderDocumentPdf(model);

      // histórico (mesmo registro de antes; agora com o HTML sóbrio do documento)
      await api.post('/doc-generator/doc-instances', {
        template_id: selectedTemplateId,
        patient_id: selectedPatientId || null,
        title: selectedTemplate?.title || 'Documento',
        rendered_html: buildStoredHtml(model)
      });
      pushToast('success', 'Documento gerado e salvo no histórico!');

      if (mode === 'download') pdf.save(pdfFileName(model.title, effectivePatientName));
      else printPdf(pdf);
    } catch (e) {
      console.error(e);
      pushToast('error', 'Erro ao gerar ou salvar o documento.');
    } finally {
      setEmitting(false);
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

  const openPreview = () => setIsPreviewModalOpen(true);

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
                disabled={!doc}
                variant="outline"
                size="sm"
                iconLeft={<Eye size={14} />}
              >
                Visualizar
              </Button>
              <Button
                onClick={() => emitDocument('download')}
                disabled={!doc || emitting}
                variant="outline"
                size="sm"
                iconLeft={<Download size={14} />}
              >
                Baixar PDF
              </Button>
              <Button
                onClick={() => emitDocument('print')}
                disabled={!doc || emitting}
                loading={emitting}
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
                        className="w-full sm:max-w-[280px]"
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
                          label="Local (cidade/UF)"
                          placeholder="Ex: Tatuí/SP"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          hint="Impresso antes da data, no fim do documento."
                          error={fieldError('city', 'city_uf')}
                        />
                      </FormRow>
                      {uses('patient_cpf') && (
                        <Input
                          label="CPF do paciente"
                          placeholder={patient?.cpf || patient?.cpf_cnpj || '000.000.000-00'}
                          value={patientCpfManual}
                          onChange={e => setPatientCpfManual(e.target.value)}
                          hint={patient?.cpf || patient?.cpf_cnpj ? 'Vazio usa o CPF do cadastro.' : undefined}
                          error={fieldError('patient_cpf')}
                        />
                      )}
                      {(uses('time_start') || uses('time_end')) && (
                        <FormRow cols={2}>
                          {uses('time_start') && (
                            <Input
                              label="Horário de início"
                              placeholder="08:00"
                              value={timeStart}
                              onChange={e => setTimeStart(e.target.value)}
                              error={fieldError('time_start')}
                            />
                          )}
                          {uses('time_end') && (
                            <Input
                              label="Horário de fim"
                              placeholder="09:00"
                              value={timeEnd}
                              onChange={e => setTimeEnd(e.target.value)}
                              error={fieldError('time_end')}
                            />
                          )}
                        </FormRow>
                      )}
                      {(uses('amount') || uses('amount_text')) && (
                        <FormRow cols={2}>
                          <Input
                            label="Valor (R$)"
                            placeholder="0,00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            error={fieldError('amount')}
                          />
                          <Input
                            label="Valor por extenso"
                            placeholder={amountToWords(amount) || 'Preenchido automaticamente pelo valor'}
                            value={amountText}
                            onChange={e => setAmountText(e.target.value)}
                            hint="Vazio gera automaticamente (reais e centavos)."
                            error={fieldError('amount_text')}
                          />
                        </FormRow>
                      )}
                      {uses('period') && (
                        <Input
                          label="Período"
                          placeholder="Ex: 01/09/2026 a 30/09/2026"
                          value={period}
                          onChange={e => setPeriod(e.target.value)}
                          error={fieldError('period')}
                        />
                      )}
                      {uses('service_name') && (
                        <Input
                          label="Serviço / finalidade"
                          placeholder="Ex: Consulta de Psicopedagogia"
                          value={serviceName}
                          onChange={e => setServiceName(e.target.value)}
                          error={fieldError('service_name')}
                        />
                      )}
                      {extraKeys.length > 0 && (
                        <FormRow cols={2}>
                          {extraKeys.map(k => (
                            <Input
                              key={k}
                              label={labelOfVariable(k).replace(/^./, c => c.toUpperCase())}
                              value={extraValues[k] || ''}
                              onChange={e => setExtraValues(prev => ({ ...prev, [k]: e.target.value }))}
                              error={fieldError(k)}
                            />
                          ))}
                        </FormRow>
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
                        error={fieldError('professional_name', 'signature_name')}
                      />
                      <Input
                        label={`Registro (${areaRegistry})`}
                        leftIcon={<CheckCircle2 size={14} />}
                        value={professionalCrp}
                        onChange={e => setProfessionalCrp(e.target.value)}
                        error={fieldError('professional_crp', 'signature_crp')}
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
                <Button variant="outline" size="xs" onClick={openPreview} disabled={!doc}>
                  Ampliar
                </Button>
              }
            >
              {!doc ? (
                <EmptyState icon={FileText} title="Selecione um modelo" description="Escolha um modelo na aba Modelo para ver o documento." />
              ) : (
                <div className="space-y-3">
                  {missing.length > 0 && (
                    <Alert variant="warning">
                      Preencha: {missingLabels}. O documento só pode ser impresso ou baixado depois disso.
                    </Alert>
                  )}
                  <div className="max-h-[640px] overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-2">
                    <DocumentPaper model={doc.model} />
                  </div>
                </div>
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
            <Button variant="outline" iconLeft={<Download size={14} />} onClick={() => emitDocument('download')} disabled={!doc || emitting}>Baixar PDF</Button>
            <Button variant="primary" iconLeft={<Printer size={14} />} onClick={() => emitDocument('print')} disabled={!doc || emitting} loading={emitting}>Imprimir</Button>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          {missing.length > 0 && (
            <Alert variant="warning">Preencha: {missingLabels}. Volte à aba Dados do documento para completar.</Alert>
          )}
          <div className="max-h-[70vh] overflow-auto rounded-lg bg-slate-100 p-2 sm:p-3">
            {doc ? <DocumentPaper model={doc.model} /> : <EmptyState icon={FileText} title="Documento vazio" />}
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
