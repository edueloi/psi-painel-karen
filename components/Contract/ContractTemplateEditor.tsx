import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Save, Loader2, Tag, X, Monitor, Building2 } from 'lucide-react';
import { Modal, ModalFooter, Button, Input, Tabs, Badge, RichTextEditor } from '../UI';
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

const contractTabs = [
  { id: 'online', label: 'Atendimento Online', icon: Monitor },
  { id: 'presencial', label: 'Atendimento Presencial', icon: Building2 },
] as const;

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
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Editor de Contrato"
        size="full"
        footer={
          <ModalFooter align="between">
            <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={preview}
                loading={previewLoading}
                disabled={previewLoading || loading}
                iconLeft={<Eye size={14} />}
              >
                Visualizar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={save}
                loading={saving}
                disabled={saving || loading}
                iconLeft={<Save size={14} />}
              >
                Salvar contrato
              </Button>
            </div>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <Tabs<'online' | 'presencial'>
            items={contractTabs}
            value={activeType}
            onChange={setActiveType}
            label="Tipo de atendimento do contrato"
          />

          {loading ? (
            <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />Carregando...
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 items-start">
              <div className="space-y-3 min-w-0">
                <Input label="Título do contrato" type="text" value={title} onChange={e => setTitle(e.target.value)} />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="ds-label">Texto do contrato</label>
                    <Badge size="sm" color={templates[activeType]?.is_customized ? 'success' : 'default'}>
                      {templates[activeType]?.is_customized ? 'Personalizado' : 'Usando modelo padrão — edite e salve para personalizar'}
                    </Badge>
                  </div>
                  <RichTextEditor
                    value={body}
                    onChange={setBody}
                    placeholder="Escreva aqui o texto completo do contrato..."
                    minHeight={420}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-primary-100 bg-primary-50/40 p-3 space-y-2 xl:sticky xl:top-0">
                <p className="flex items-center gap-1.5 text-xs font-medium text-primary-700">
                  <Tag size={12} /> Inserir variável
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      title={v.label}
                      onClick={() => insertVariable(v.key)}
                      className="px-2 py-1 bg-white border border-primary-200 rounded-md text-[11px] font-medium text-primary-700 hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-colors"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">A variável é inserida no fim do texto — recorte e cole onde precisar.</p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {previewHtml !== null && (
        <Modal
          isOpen
          onClose={() => setPreviewHtml(null)}
          title="Pré-visualização do Contrato"
          size="xl"
          zIndex={70}
          footer={
            <ModalFooter align="right">
              <Button variant="outline" size="sm" iconLeft={<X size={14} />} onClick={() => setPreviewHtml(null)}>Fechar</Button>
            </ModalFooter>
          }
        >
          <div className="bg-slate-50 rounded-lg p-3 sm:p-6 border border-slate-200">
            <div
              className="max-w-none [&_h1]:text-lg [&_h1]:font-medium [&_h1]:mb-4 [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:mb-3 [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </Modal>
      )}
    </>
  );
};
