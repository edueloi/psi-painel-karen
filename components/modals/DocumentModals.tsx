import React, { useState } from 'react';
import { Modal, ModalFooter, Button, Input, Select, Textarea, FormRow, Tabs } from '../UI';
import { api } from '../../services/api';
import { Save, ArrowRight, ClipboardCheck, ClipboardList, FileText, FileSignature, Send } from 'lucide-react';

interface Patient {
  id: string;
  full_name: string;
  birth_date?: string;
  cpf?: string;
}

interface Professional {
  name?: string;
  crp?: string;
  specialty?: string;
  address?: string;
  phone?: string;
  companyName?: string;
}

interface DocModalProps {
  patient: Patient;
  professional?: Professional;
  onClose: () => void;
  onSaved: () => void;
}

/* ── helpers ── */
const ProfCard: React.FC<{ professional?: Professional }> = ({ professional }) => {
  if (!professional?.name) return null;
  return (
    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-0.5 text-slate-700">
      <p className="font-medium text-[11px] text-slate-500 mb-1">Profissional responsável</p>
      <p className="font-medium text-slate-900">{professional.name}</p>
      {professional.specialty && <p>{professional.specialty}</p>}
      {professional.crp && <p>CRP: {professional.crp}</p>}
      {professional.companyName && <p className="text-slate-500">{professional.companyName}</p>}
      {professional.address && <p className="text-slate-500">{professional.address}</p>}
      {professional.phone && <p className="text-slate-500">{professional.phone}</p>}
    </div>
  );
};

const PatientBanner: React.FC<{ icon: React.ElementType; label: string; patient: Patient }> = ({ icon: Icon, label, patient }) => (
  <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg border border-primary-100">
    <div className="w-8 h-8 rounded-lg bg-white border border-primary-100 flex items-center justify-center text-primary-600 shrink-0">
      <Icon size={15} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-primary-700">{label}</p>
      <p className="text-xs text-slate-700 break-words">{patient.full_name}{patient.cpf ? ` · CPF ${patient.cpf}` : ''}</p>
    </div>
  </div>
);

const docTabs = [
  { id: 'dados', label: 'Dados', icon: ClipboardList },
  { id: 'conteudo', label: 'Conteúdo', icon: FileText },
] as const;
type DocTabId = typeof docTabs[number]['id'];

/* ════════════════════════════════════════════════════
   RELATÓRIO
════════════════════════════════════════════════════ */
export const RelatorioModal: React.FC<DocModalProps> = ({ patient, professional, onClose, onSaved }) => {
  const today = new Date().toISOString().split('T')[0];
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo: 'Relatório Psicológico',
    finalidade: 'Clínico-Interno',
    destinatario: '',
    cid: '',
    conteudo: '',
    conclusao: '',
    data_emissao: today,
  });

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!form.conteudo.trim()) return;
    setSaving(true);
    try {
      const title = `${form.tipo} — ${patient.full_name} — ${new Date(form.data_emissao).toLocaleDateString('pt-BR')}`;
      const profLine = professional?.name
        ? `\nPROFISSIONAL: ${professional.name}${professional.crp ?` · CRP ${professional.crp}` : ''}${professional.specialty ? ` · ${professional.specialty}` : ''}`
        : '';
      const content = [
        `TIPO: ${form.tipo}`,
        `FINALIDADE: ${form.finalidade}`,
        form.destinatario ? `DESTINATÁRIO: ${form.destinatario}` : '',
        form.cid ? `CID-10: ${form.cid}` : '',
        profLine,
        '',
        'CONTEÚDO:',
        form.conteudo,
        '',
        form.conclusao ? `CONCLUSÃO:\n${form.conclusao}` : '',
      ].filter(v => v !== undefined && v !== '').join('\n');

      await api.post('/medical-records', {
        patient_id: patient.id,
        record_type: 'Relatorio',
        title,
        status: 'Aprovado',
        content,
        ai_organized_content: JSON.stringify({ ...form, professional }),
        created_at: form.data_emissao,
      });
      onSaved();
      onClose();
    } catch {
      alert('Erro ao salvar relatório');
    } finally {
      setSaving(false);
    }
  };

  const [tab, setTab] = useState<DocTabId>('dados');
  const trySave = () => {
    if (!form.conteudo.trim()) { setTab('conteudo'); return; }
    save();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Relatório / Laudo"
      subtitle={`Paciente: ${patient.full_name}`}
      size="xl"
      footer={
        <ModalFooter align="between">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button onClick={trySave} loading={saving} disabled={saving} variant="primary" size="sm" iconLeft={<Save size={14} />}>
            Salvar relatório
          </Button>
        </ModalFooter>
      }
    >
      <div className="space-y-3">
        <PatientBanner icon={FileText} label="Relatório técnico" patient={patient} />

        <Tabs<DocTabId> items={docTabs} value={tab} onChange={setTab} label="Seções do relatório">
          {tab === 'dados' && (
            <div className="space-y-3">
              <ProfCard professional={professional} />
              <FormRow cols={2}>
                <Select label="Tipo de documento *" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                  {['Relatório Psicológico','Laudo Psicológico','Relatório de Alta','Relatório de Acompanhamento','Declaração','Outro'].map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </Select>
                <Select label="Finalidade" value={form.finalidade} onChange={e => set('finalidade', e.target.value)}>
                  {['Clínico-Interno','Judicial','Escolar','Previdenciária','Médica','Seguro','Outro'].map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </Select>
                <Input label="Destinatário" placeholder="Pessoa, instituição ou setor..." value={form.destinatario} onChange={e => set('destinatario', e.target.value)} />
                <FormRow cols={2}>
                  <Input label="CID-10 (opcional)" placeholder="Ex: F41.1" value={form.cid} onChange={e => set('cid', e.target.value)} />
                  <Input label="Data de emissão" type="date" value={form.data_emissao} onChange={e => set('data_emissao', e.target.value)} />
                </FormRow>
              </FormRow>
            </div>
          )}

          {tab === 'conteudo' && (
            <div className="space-y-3">
              <Textarea
                label="Conteúdo principal *"
                rows={9}
                placeholder="Descreva o histórico, achados clínicos, intervenções realizadas, evolução do processo..."
                value={form.conteudo}
                onChange={e => set('conteudo', e.target.value)}
                error={!form.conteudo.trim() ? 'Obrigatório para salvar.' : undefined}
              />
              <Textarea
                label="Conclusão / parecer"
                rows={4}
                placeholder="Conclusão, recomendações e parecer final..."
                value={form.conclusao}
                onChange={e => set('conclusao', e.target.value)}
              />
            </div>
          )}
        </Tabs>
      </div>
    </Modal>
  );
};

/* ════════════════════════════════════════════════════
   ENCAMINHAMENTO
════════════════════════════════════════════════════ */
export const EncaminhamentoModal: React.FC<DocModalProps> = ({ patient, professional, onClose, onSaved }) => {
  const today = new Date().toISOString().split('T')[0];
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    especialidade: 'Psiquiatria',
    profissional_instituicao: '',
    motivo: '',
    urgencia: 'Normal',
    informacoes_clinicas: '',
    recomendacoes: '',
    data: today,
  });

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!form.motivo.trim()) return;
    setSaving(true);
    try {
      const title = `Encaminhamento ${form.especialidade} — ${patient.full_name} — ${new Date(form.data).toLocaleDateString('pt-BR')}`;
      const profLine = professional?.name
        ? `\nPROFISSIONAL SOLICITANTE: ${professional.name}${professional.crp ?` · CRP ${professional.crp}` : ''}${professional.specialty ? ` · ${professional.specialty}` : ''}`
        : '';
      const content = [
        `ESPECIALIDADE: ${form.especialidade}`,
        form.profissional_instituicao ? `PROFISSIONAL/INSTITUIÇÃO DESTINO: ${form.profissional_instituicao}` : '',
        `URGÊNCIA: ${form.urgencia}`,
        profLine,
        '',
        `MOTIVO DO ENCAMINHAMENTO:\n${form.motivo}`,
        form.informacoes_clinicas ? `\nINFORMAÇÕES CLÍNICAS RELEVANTES:\n${form.informacoes_clinicas}` : '',
        form.recomendacoes ? `\nRECOMENDAÇÕES:\n${form.recomendacoes}` : '',
      ].filter(v => v !== undefined && v !== '').join('\n');

      await api.post('/medical-records', {
        patient_id: patient.id,
        record_type: 'Encaminhamento',
        title,
        status: 'Aprovado',
        content,
        ai_organized_content: JSON.stringify({ ...form, professional }),
        created_at: form.data,
      });
      onSaved();
      onClose();
    } catch {
      alert('Erro ao salvar encaminhamento');
    } finally {
      setSaving(false);
    }
  };

  const [tab, setTab] = useState<DocTabId>('dados');
  const trySave = () => {
    if (!form.motivo.trim()) { setTab('conteudo'); return; }
    save();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Encaminhamento"
      subtitle={`Paciente: ${patient.full_name}`}
      size="xl"
      footer={
        <ModalFooter align="between">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button onClick={trySave} loading={saving} disabled={saving} variant="primary" size="sm" iconLeft={<ArrowRight size={14} />}>
            Registrar encaminhamento
          </Button>
        </ModalFooter>
      }
    >
      <div className="space-y-3">
        <PatientBanner icon={Send} label="Encaminhamento clínico" patient={patient} />

        <Tabs<DocTabId> items={docTabs} value={tab} onChange={setTab} label="Seções do encaminhamento">
          {tab === 'dados' && (
            <div className="space-y-3">
              <ProfCard professional={professional} />
              <FormRow cols={2}>
                <Select label="Especialidade de destino *" value={form.especialidade} onChange={e => set('especialidade', e.target.value)}>
                  {['Psiquiatria','Neurologia','Fonoaudiologia','Terapia Ocupacional','Psicologia Especializada','Nutrição','Fisioterapia','Cardiologia','Clínico Geral','Outro'].map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </Select>
                <Select label="Urgência" value={form.urgencia} onChange={e => set('urgencia', e.target.value)}>
                  {['Normal','Urgente','Emergência'].map(o => <option key={o}>{o}</option>)}
                </Select>
                <Input label="Profissional / instituição destino" placeholder="Nome do profissional ou serviço receptor..." value={form.profissional_instituicao} onChange={e => set('profissional_instituicao', e.target.value)} />
                <Input label="Data do encaminhamento" type="date" value={form.data} onChange={e => set('data', e.target.value)} />
              </FormRow>
            </div>
          )}

          {tab === 'conteudo' && (
            <div className="space-y-3">
              <Textarea
                label="Motivo do encaminhamento *"
                rows={5}
                placeholder="Descreva o motivo clínico que justifica o encaminhamento..."
                value={form.motivo}
                onChange={e => set('motivo', e.target.value)}
                error={!form.motivo.trim() ? 'Obrigatório para salvar.' : undefined}
              />
              <Textarea
                label="Informações clínicas relevantes"
                rows={4}
                placeholder="Histórico, diagnóstico, medicações em uso, contexto relevante..."
                value={form.informacoes_clinicas}
                onChange={e => set('informacoes_clinicas', e.target.value)}
              />
              <Textarea
                label="Recomendações / orientações ao destino"
                rows={3}
                placeholder="Orientações específicas para o profissional ou serviço receptor..."
                value={form.recomendacoes}
                onChange={e => set('recomendacoes', e.target.value)}
              />
            </div>
          )}
        </Tabs>
      </div>
    </Modal>
  );
};

/* ════════════════════════════════════════════════════
   ATESTADO
════════════════════════════════════════════════════ */
export const AtestadoModal: React.FC<DocModalProps> = ({ patient, professional, onClose, onSaved }) => {
  const today = new Date().toISOString().split('T')[0];
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo: 'Comparecimento',
    data_emissao: today,
    afastamento_inicio: today,
    afastamento_fim: today,
    dias_afastamento: '',
    cid: '',
    finalidade: '',
    observacoes: '',
  });

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const isAfastamento = form.tipo === 'Afastamento';

  const save = async () => {
    setSaving(true);
    try {
      const dateStr = new Date(form.data_emissao).toLocaleDateString('pt-BR');
      const title = `Atestado de ${form.tipo} — ${patient.full_name} — ${dateStr}`;

      const profBlock = professional?.name ? [
        '',
        '─────────────────────────────',
        `PROFISSIONAL: ${professional.name}`,
        professional.specialty ? `ESPECIALIDADE: ${professional.specialty}` : '',
        professional.crp ? `CRP: ${professional.crp}` : '',
        professional.companyName ? `CLÍNICA/CONSULTÓRIO: ${professional.companyName}` : '',
        professional.address ? `ENDEREÇO: ${professional.address}` : '',
        professional.phone ? `TELEFONE: ${professional.phone}` : '',
      ].filter(Boolean) : [];

      const lines = [
        `ATESTADO DE ${form.tipo.toUpperCase()}`,
        '',
        `Atesto que o(a) paciente ${patient.full_name}${patient.cpf ? `, CPF ${patient.cpf}` : ''}, esteve sob meus cuidados profissionais.`,
        '',
        `TIPO: ${form.tipo}`,
        `DATA DE EMISSÃO: ${dateStr}`,
        form.cid ? `CID-10: ${form.cid}` : '',
        form.finalidade ? `FINALIDADE: ${form.finalidade}` : '',
        isAfastamento ? `PERÍODO DE AFASTAMENTO: ${new Date(form.afastamento_inicio).toLocaleDateString('pt-BR')} a ${new Date(form.afastamento_fim).toLocaleDateString('pt-BR')}` : '',
        isAfastamento && form.dias_afastamento ? `TOTAL DE DIAS: ${form.dias_afastamento} dia(s)` : '',
        form.observacoes ? `\nOBSERVAÇÕES:\n${form.observacoes}` : '',
        ...profBlock,
      ].filter(v => v !== undefined && v !== '').join('\n');

      await api.post('/medical-records', {
        patient_id: patient.id,
        record_type: 'Atestado',
        title,
        status: 'Aprovado',
        content: lines,
        ai_organized_content: JSON.stringify({ ...form, professional }),
        created_at: form.data_emissao,
      });
      onSaved();
      onClose();
    } catch {
      alert('Erro ao salvar atestado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Atestado"
      subtitle={`Paciente: ${patient.full_name}`}
      size="lg"
      footer={
        <ModalFooter align="between">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving} disabled={saving} variant="primary" size="sm" iconLeft={<ClipboardCheck size={14} />}>
            Emitir atestado
          </Button>
        </ModalFooter>
      }
    >
      <div className="space-y-3">
        <PatientBanner icon={FileSignature} label="Atestado psicológico" patient={patient} />

        <ProfCard professional={professional} />

        <FormRow cols={2}>
          <Select label="Tipo de atestado *" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
            {['Comparecimento','Afastamento','Aptidão Psicológica','Declaração de Atendimento','Outro'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </Select>
          <Input label="Data de emissão *" type="date" value={form.data_emissao} onChange={e => set('data_emissao', e.target.value)} />
        </FormRow>

        {isAfastamento && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <FormRow cols={3}>
              <Input label="Início do afastamento" type="date" value={form.afastamento_inicio} onChange={e => set('afastamento_inicio', e.target.value)} />
              <Input label="Fim do afastamento" type="date" value={form.afastamento_fim} onChange={e => set('afastamento_fim', e.target.value)} />
              <Input label="Nº de dias" type="number" min="1" placeholder="Ex: 7" value={form.dias_afastamento} onChange={e => set('dias_afastamento', e.target.value)} />
            </FormRow>
          </div>
        )}

        <FormRow cols={2}>
          <Input label="CID-10 (opcional)" placeholder="Ex: F41.1" value={form.cid} onChange={e => set('cid', e.target.value)} />
          <Input label="Finalidade" placeholder="Ex: Apresentar na empresa, escola..." value={form.finalidade} onChange={e => set('finalidade', e.target.value)} />
        </FormRow>

        <Textarea
          label="Observações / recomendações"
          rows={3}
          placeholder="Recomendações de repouso, restrições de atividades..."
          value={form.observacoes}
          onChange={e => set('observacoes', e.target.value)}
        />

        <p className="text-[11px] text-slate-500 text-center">
          Salvo no prontuário como <span className="font-medium text-emerald-600">Aprovado</span>. Os dados do profissional são incluídos automaticamente.
        </p>
      </div>
    </Modal>
  );
};
