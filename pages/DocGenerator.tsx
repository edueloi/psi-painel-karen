import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
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
  X
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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

const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientName, setPatientName] = useState('');
  const [professionalName, setProfessionalName] = useState('');
  const [professionalCrp, setProfessionalCrp] = useState('');
  const [city, setCity] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [amount, setAmount] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [footerLogoUrl, setFooterLogoUrl] = useState('');

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateCategoryId, setTemplateCategoryId] = useState<string>('');
  const [templateDocType, setTemplateDocType] = useState('');
  const [templateHeaderLogo, setTemplateHeaderLogo] = useState('');
  const [templateFooterLogo, setTemplateFooterLogo] = useState('');
  const [templateSignatureName, setTemplateSignatureName] = useState('');
  const [templateSignatureCrp, setTemplateSignatureCrp] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [patientsData, categoriesData, templatesData] = await Promise.all([
        api.get<Patient[]>('/patients'),
        api.get<any[]>('/doc-generator/doc-categories'),
        api.get<any[]>('/doc-generator/doc-templates')
      ]);
      setPatients(patientsData);
      setCategories(
        (categoriesData || []).map((c: any) => ({ id: String(c.id), name: c.name }))
      );
      setTemplates(
        (templatesData || []).map((t: any) => ({
          id: String(t.id),
          category_id: t.category_id ? String(t.category_id) : null,
          title: t.title,
          doc_type: t.doc_type,
          template_body: t.template_body,
          header_logo_url: t.header_logo_url,
          footer_logo_url: t.footer_logo_url,
          signature_name: t.signature_name,
          signature_crp: t.signature_crp
        }))
      );
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
    if (!selectedCategoryId) return templates;
    return templates.filter(t => String(t.category_id || '') === selectedCategoryId);
  }, [templates, selectedCategoryId]);

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const buildData = () => {
    const name = patient?.full_name || patientName.trim();
    const d = new Date(docDate);
    return {
      patient_name: name,
      professional_name: professionalName.trim(),
      professional_crp: professionalCrp.trim(),
      date: formatDate(docDate),
      time_start: timeStart,
      time_end: timeEnd,
      service_name: serviceName.trim(),
      amount: amount.trim(),
      city: city.trim(),
      year: Number.isNaN(d.getTime()) ? '' : String(d.getFullYear()),
      month_name: Number.isNaN(d.getTime()) ? '' : monthNames[d.getMonth()] || ''
    };
  };

  const buildHtml = (body: string) => {
    const headerLogo = logoUrl || selectedTemplate?.header_logo_url || '';
    const footerLogo = footerLogoUrl || selectedTemplate?.footer_logo_url || '';

    return `
      <div style="font-family: 'Times New Roman', serif; color: #111; font-size: 12pt;">
        ${headerLogo ? `<div style="text-align: center; margin-bottom: 16px;"><img src="${headerLogo}" style="max-height: 90px;" /></div>` : ''}
        <div style="white-space: pre-wrap; line-height: 1.6;">${body}</div>
        ${footerLogo ? `<div style="text-align: center; margin-top: 24px;"><img src="${footerLogo}" style="max-height: 70px;" /></div>` : ''}
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
  }, [selectedTemplateId, selectedPatientId, patientName, professionalName, professionalCrp, city, docDate, timeStart, timeEnd, serviceName, amount, logoUrl, footerLogoUrl]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await api.post('/doc-generator/doc-categories', { name: newCategoryName.trim() });
      setNewCategoryName('');
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
      setTemplateDocType(tpl.doc_type || '');
      setTemplateHeaderLogo(tpl.header_logo_url || '');
      setTemplateFooterLogo(tpl.footer_logo_url || '');
      setTemplateSignatureName(tpl.signature_name || '');
      setTemplateSignatureCrp(tpl.signature_crp || '');
    } else {
      setEditingTemplateId(null);
      setTemplateTitle('');
      setTemplateBody('');
      setTemplateCategoryId(selectedCategoryId || '');
      setTemplateDocType('');
      setTemplateHeaderLogo('');
      setTemplateFooterLogo('');
      setTemplateSignatureName('');
      setTemplateSignatureCrp('');
    }
    setIsTemplateModalOpen(true);
  };

  const saveTemplate = async () => {
    if (!templateTitle.trim() || !templateBody.trim()) return;
    const payload = {
      title: templateTitle.trim(),
      category_id: templateCategoryId || null,
      doc_type: templateDocType || null,
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

  const deleteTemplate = async (id: string) => {
    if (!window.confirm('Excluir template?')) return;
    try {
      await api.delete(`/doc-generator/doc-templates/${id}`);
      await fetchData();
      if (selectedTemplateId === id) setSelectedTemplateId('');
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

      await api.post('/doc-generator/doc-instances', {
        template_id: selectedTemplateId,
        patient_id: selectedPatientId || null,
        professional_user_id: null,
        title: selectedTemplate?.title || 'Documento',
        data_json: data,
        rendered_html: html
      });

      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Documento</title>
            <style>
              @page { size: A4; margin: 20mm; }
              body { font-family: 'Times New Roman', serif; }
            </style>
          </head>
          <body>${html}</body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6 animate-fadeIn font-sans pb-10">
      <div className="w-full lg:w-[420px] bg-white rounded-[24px] border border-slate-200 shadow-xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="font-display font-bold text-xl text-slate-800 flex items-center gap-2">
            <FileText className="text-indigo-600" /> {t('nav.docGen')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">Gerador de documentos clinicos.</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={16} /> Carregando...
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoria</label>
                <div className="flex gap-2">
                  <select
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddCategory}
                    className="px-3 rounded-xl bg-slate-900 text-white text-xs font-bold"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <input
                  className="w-full mt-2 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                  placeholder="Nova categoria"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Template</label>
                <div className="flex gap-2">
                  <select
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {filteredTemplates.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => openTemplateModal(selectedTemplate || undefined)}
                    className="px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                  >
                    <Save size={16} />
                  </button>
                  <button
                    onClick={() => openTemplateModal()}
                    className="px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {selectedTemplate && (
                  <button
                    onClick={() => deleteTemplate(selectedTemplate.id)}
                    className="mt-2 text-xs text-red-600"
                  >
                    Remover template
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Paciente</label>
                <div className="relative">
                  <select
                    className="w-full p-3 pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                      const p = patients.find(pt => String(pt.id) === e.target.value);
                      setPatientName(p?.full_name || '');
                      setCity(p?.city || '');
                    }}
                  >
                    <option value="">Selecione...</option>
                    {patients.map(p => <option key={p.id} value={String(p.id)}>{p.full_name}</option>)}
                  </select>
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                <input
                  className="w-full mt-2 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                  placeholder="Paciente (manual)"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data</label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full p-3 pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cidade</label>
                  <input
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inicio</label>
                  <div className="relative">
                    <input
                      type="time"
                      className="w-full p-3 pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                      value={timeStart}
                      onChange={(e) => setTimeStart(e.target.value)}
                    />
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fim</label>
                  <input
                    type="time"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Servico / Valor</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                    placeholder="Servico"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                  />
                  <input
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                    placeholder="Valor"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Profissional</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                    placeholder="Nome"
                    value={professionalName}
                    onChange={(e) => setProfessionalName(e.target.value)}
                  />
                  <input
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                    placeholder="CRP"
                    value={professionalCrp}
                    onChange={(e) => setProfessionalCrp(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Logo (opcional)</label>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                    placeholder="Logo cabecalho (URL)"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                  <input
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                    placeholder="Logo rodape (URL)"
                    value={footerLogoUrl}
                    onChange={(e) => setFooterLogoUrl(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={handleGeneratePdf}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            <Printer size={18} /> Gerar PDF
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-800/50 rounded-[24px] border border-slate-200/50 p-8 flex justify-center backdrop-blur-sm overflow-hidden">
        <div className="bg-white w-full max-w-[210mm] aspect-[1/1.414] p-[20mm] shadow-2xl relative flex flex-col text-slate-700">
          {isRendering ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="animate-spin" size={16} /> Renderizando...
            </div>
          ) : previewHtml ? (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <FileText size={64} className="opacity-10 mb-4" />
              <p className="font-bold">Pre-visualizacao do Documento</p>
              <p className="text-xs">Selecione um template e preencha os dados.</p>
            </div>
          )}
        </div>
      </div>

      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">Template</h3>
                <p className="text-xs text-slate-500">Use marcadores como {'{{patient_name}}'} e {'{{date}}'}</p>
              </div>
              <button onClick={() => setIsTemplateModalOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full p-3 rounded-xl border border-slate-200"
                  placeholder="Titulo"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                />
                <select
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white"
                  value={templateCategoryId}
                  onChange={(e) => setTemplateCategoryId(e.target.value)}
                >
                  <option value="">Sem categoria</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full p-3 rounded-xl border border-slate-200"
                  placeholder="Tipo (opcional)"
                  value={templateDocType}
                  onChange={(e) => setTemplateDocType(e.target.value)}
                />
                <input
                  className="w-full p-3 rounded-xl border border-slate-200"
                  placeholder="Logo cabecalho (URL)"
                  value={templateHeaderLogo}
                  onChange={(e) => setTemplateHeaderLogo(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full p-3 rounded-xl border border-slate-200"
                  placeholder="Logo rodape (URL)"
                  value={templateFooterLogo}
                  onChange={(e) => setTemplateFooterLogo(e.target.value)}
                />
                <input
                  className="w-full p-3 rounded-xl border border-slate-200"
                  placeholder="Assinatura (nome)"
                  value={templateSignatureName}
                  onChange={(e) => setTemplateSignatureName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full p-3 rounded-xl border border-slate-200"
                  placeholder="CRP"
                  value={templateSignatureCrp}
                  onChange={(e) => setTemplateSignatureCrp(e.target.value)}
                />
              </div>
              <textarea
                className="w-full min-h-[260px] p-4 rounded-xl border border-slate-200"
                placeholder="Conteudo do template"
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
              />
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsTemplateModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
              <button onClick={saveTemplate} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
