import React, { useState, useEffect, useCallback } from 'react';
import { FileSignature, Eye, Save, Loader2, Tag, X } from 'lucide-react';
import { Modal } from '../UI/Modal';
import { RichTextEditor } from '../UI/RichTextEditor';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';

interface ContractTemplate {
  contract_type: 'online' | 'presencial';
  title: string;
  template_body: string;
  is_customized: boolean;
  updated_at: string | null;
}

const VARIABLES: { key: string; label: string }[] = [
  { key: '{{patient_name}}', label: 'Nome do paciente' },
  { key: '{{patient_cpf}}', label: 'CPF do paciente' },
  { key: '{{patient_address}}', label: 'Endereço do paciente' },
  { key: '{{professional_name}}', label: 'Nome do profissional' },
  { key: '{{professional_cpf}}', label: 'CPF do profissional' },
  { key: '{{professional_crp}}', label: 'CRP do profissional' },
  { key: '{{pix_key}}', label: 'Chave PIX' },
  { key: '{{clinic_address}}', label: 'Endereço do consultório' },
  { key: '{{session_day}}', label: 'Dia da sessão' },
  { key: '{{session_time}}', label: 'Horário da sessão' },
  { key: '{{city}}', label: 'Cidade' },
  { key: '{{date}}', label: 'Data de hoje' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ContractTemplateEditor: React.FC<Props> = ({ isOpen, onClose }) => {
  const { pushToast } = useToast();
  const [activeType, setActiveType] = useState<'online' | 'presencial'>('online');
  const [templates, setTemplates] = useState<Record<string, ContractTemplate>>({});
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ContractTemplate[]>('/contract-send/templates');
      const byType = Object.fromEntries((data || []).map(t => [t.contract_type, t]));
      setTemplates(byType);
    } catch {
      pushToast('error', 'Erro ao carregar templates de contrato');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  useEffect(() => {
    const tpl = templates[activeType];
    if (tpl) { setBody(tpl.template_body); setTitle(tpl.title); }
  }, [activeType, templates]);

  const insertVariable = (key: string) => {
    setBody(prev => `${prev}${key}`);
  };

  const save = async () => {
    if (!body.trim()) { pushToast('error', 'O texto do contrato não pode ficar vazio'); return; }
    setSaving(true);
    try {
      await api.put(`/contract-send/templates/${activeType}`, { title, template_body: body });
      pushToast('success', 'Contrato salvo com sucesso');
      await load();
    } catch {
      pushToast('error', 'Erro ao salvar contrato');
    } finally { setSaving(false); }
  };

  const preview = async () => {
    setPreviewLoading(true);
    try {
      const res = await api.get<{ title: string; html: string }>(`/contract-send/templates/${activeType}/preview`);
      setPreviewHtml(res.html);
    } catch {
      pushToast('error', 'Erro ao gerar pré-visualização');
    } finally { setPreviewLoading(false); }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Editor de Contrato" maxWidth="max-w-4xl">
        <div className="space-y-5">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
            {(['online', 'presencial'] as const).map(type => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                  activeType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type === 'online' ? 'Atendimento Online' : 'Atendimento Presencial'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Título do contrato</label>
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full h-11 px-4 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Texto do contrato</label>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {templates[activeType]?.is_customized ? 'Personalizado' : 'Usando modelo padrão — edite e salve para personalizar'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <span className="flex items-center gap-1 text-[10px] font-black text-indigo-500 uppercase tracking-wide px-1">
                    <Tag size={11} /> Inserir variável:
                  </span>
                  {VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      title={v.label}
                      onClick={() => insertVariable(v.key)}
                      className="px-2 py-1 bg-white border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 px-1">A variável é inserida no fim do texto — recorte e cole onde precisar.</p>

                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  placeholder="Escreva aqui o texto completo do contrato..."
                  minHeight={420}
                />
              </div>

              <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={preview}
                  disabled={previewLoading}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-xl uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  {previewLoading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} Visualizar
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 transition-all font-black text-[11px] uppercase tracking-widest disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar contrato
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {previewHtml !== null && (
        <Modal isOpen onClose={() => setPreviewHtml(null)} title="Pré-visualização do Contrato" maxWidth="max-w-3xl">
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-8 max-h-[70vh] overflow-y-auto border border-slate-100">
            <div
              className="max-w-none [&_h1]:text-xl [&_h1]:font-black [&_h1]:mb-5 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-4 [&_strong]:font-extrabold"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setPreviewHtml(null)}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-black text-slate-500 hover:text-slate-700 uppercase tracking-widest transition-colors"
            >
              <X size={14} /> Fechar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};
