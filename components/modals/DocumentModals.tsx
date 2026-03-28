import React, { useState } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { api } from '../../services/api';
import { Save, ArrowRight, ClipboardCheck } from 'lucide-react';

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
const Field: React.FC<{ label: string; children: React.ReactNode; required?: boolean }> = ({ label, children, required }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
      {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const ProfCard: React.FC<{ professional?: Professional; color: string }> = ({ professional, color }) => {
  if (!professional?.name) return null;
  return (
    <div className={`p-3 rounded-xl border text-xs space-y-0.5 ${color}`}>
      <p className="font-black text-[10px] uppercase tracking-widest opacity-60 mb-1">Profissional Responsável</p>
      <p className="font-bold">{professional.name}</p>
      {professional.specialty && <p className="opacity-80">{professional.specialty}</p>}
      {professional.crp && <p className="opacity-80">CRP: {professional.crp}</p>}
      {professional.companyName && <p className="opacity-70">{professional.companyName}</p>}
      {professional.address && <p className="opacity-70">{professional.address}</p>}
      {professional.phone && <p className="opacity-70">{professional.phone}</p>}
    </div>
  );
};

const inputCls = 'w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:bg-white transition';
const selectCls = 'w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:bg-white transition';
const textareaCls = 'w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:bg-white transition resize-none';

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
        ? `\nPROFISSIONAL: ${professional.name}${professional.crp ? ` · CRP ${professional.crp}` : ''}${professional.specialty ? ` · ${professional.specialty}` : ''}`
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

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Relatório / Laudo"
      subtitle={`Paciente: ${patient.full_name}`}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose} className="uppercase text-[10px] font-black tracking-widest px-3 h-9">Cancelar</Button>
          <Button onClick={save} isLoading={saving} variant="primary" className="h-9 px-5 gap-1.5 uppercase text-[10px] font-black tracking-widest bg-blue-600 hover:bg-blue-700 border-blue-600 shadow-lg shadow-blue-200">
            <Save size={14}/> Salvar Relatório
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-base">📄</div>
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Relatório Técnico</p>
            <p className="text-xs text-slate-500">{patient.full_name}{patient.cpf ? ` · CPF ${patient.cpf}` : ''}</p>
          </div>
        </div>

        <ProfCard professional={professional} color="bg-blue-50 border-blue-100 text-blue-800"/>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de Documento" required>
            <select className={selectCls} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {['Relatório Psicológico','Laudo Psicológico','Relatório de Alta','Relatório de Acompanhamento','Declaração','Outro'].map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Finalidade">
            <select className={selectCls} value={form.finalidade} onChange={e => set('finalidade', e.target.value)}>
              {['Clínico-Interno','Judicial','Escolar','Previdenciária','Médica','Seguro','Outro'].map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Destinatário">
            <input className={inputCls} placeholder="Pessoa, instituição ou setor..." value={form.destinatario} onChange={e => set('destinatario', e.target.value)}/>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CID-10 (opcional)">
              <input className={inputCls} placeholder="Ex: F41.1" value={form.cid} onChange={e => set('cid', e.target.value)}/>
            </Field>
            <Field label="Data de Emissão">
              <input type="date" className={inputCls} value={form.data_emissao} onChange={e => set('data_emissao', e.target.value)}/>
            </Field>
          </div>
        </div>

        <Field label="Conteúdo Principal" required>
          <textarea
            className={textareaCls}
            rows={7}
            placeholder="Descreva o histórico, achados clínicos, intervenções realizadas, evolução do processo..."
            value={form.conteudo}
            onChange={e => set('conteudo', e.target.value)}
          />
        </Field>

        <Field label="Conclusão / Parecer">
          <textarea
            className={textareaCls}
            rows={3}
            placeholder="Conclusão, recomendações e parecer final..."
            value={form.conclusao}
            onChange={e => set('conclusao', e.target.value)}
          />
        </Field>
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
        ? `\nPROFISSIONAL SOLICITANTE: ${professional.name}${professional.crp ? ` · CRP ${professional.crp}` : ''}${professional.specialty ? ` · ${professional.specialty}` : ''}`
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

  const urgencyColor: Record<string, string> = {
    Normal: 'text-slate-500',
    Urgente: 'text-amber-600',
    'Emergência': 'text-rose-600',
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Encaminhamento"
      subtitle={`Paciente: ${patient.full_name}`}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose} className="uppercase text-[10px] font-black tracking-widest px-3 h-9">Cancelar</Button>
          <Button onClick={save} isLoading={saving} variant="primary" className="h-9 px-5 gap-1.5 uppercase text-[10px] font-black tracking-widest bg-amber-500 hover:bg-amber-600 border-amber-500 shadow-lg shadow-amber-200">
            <ArrowRight size={14}/> Registrar Encaminhamento
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-base">🔄</div>
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Encaminhamento Clínico</p>
            <p className="text-xs text-slate-500">{patient.full_name}{patient.cpf ? ` · CPF ${patient.cpf}` : ''}</p>
          </div>
        </div>

        <ProfCard professional={professional} color="bg-amber-50 border-amber-100 text-amber-800"/>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Especialidade de Destino" required>
            <select className={selectCls} value={form.especialidade} onChange={e => set('especialidade', e.target.value)}>
              {['Psiquiatria','Neurologia','Fonoaudiologia','Terapia Ocupacional','Psicologia Especializada','Nutrição','Fisioterapia','Cardiologia','Clínico Geral','Outro'].map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Urgência">
            <select className={`${selectCls} font-bold ${urgencyColor[form.urgencia]}`} value={form.urgencia} onChange={e => set('urgencia', e.target.value)}>
              {['Normal','Urgente','Emergência'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Profissional / Instituição Destino">
            <input className={inputCls} placeholder="Nome do profissional ou serviço receptor..." value={form.profissional_instituicao} onChange={e => set('profissional_instituicao', e.target.value)}/>
          </Field>
          <Field label="Data do Encaminhamento">
            <input type="date" className={inputCls} value={form.data} onChange={e => set('data', e.target.value)}/>
          </Field>
        </div>

        <Field label="Motivo do Encaminhamento" required>
          <textarea
            className={textareaCls}
            rows={4}
            placeholder="Descreva o motivo clínico que justifica o encaminhamento..."
            value={form.motivo}
            onChange={e => set('motivo', e.target.value)}
          />
        </Field>

        <Field label="Informações Clínicas Relevantes">
          <textarea
            className={textareaCls}
            rows={3}
            placeholder="Histórico, diagnóstico, medicações em uso, contexto relevante..."
            value={form.informacoes_clinicas}
            onChange={e => set('informacoes_clinicas', e.target.value)}
          />
        </Field>

        <Field label="Recomendações / Orientações ao Destino">
          <textarea
            className={textareaCls}
            rows={2}
            placeholder="Orientações específicas para o profissional ou serviço receptor..."
            value={form.recomendacoes}
            onChange={e => set('recomendacoes', e.target.value)}
          />
        </Field>
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
        `Atesto que o(a) paciente ${patient.full_name}${patient.cpf ? `, CPF ${patient.cpf}` : ''}, esteve sob meus cuidados psicológicos.`,
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
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose} className="uppercase text-[10px] font-black tracking-widest px-3 h-9">Cancelar</Button>
          <Button onClick={save} isLoading={saving} variant="primary" className="h-9 px-5 gap-1.5 uppercase text-[10px] font-black tracking-widest bg-rose-600 hover:bg-rose-700 border-rose-600 shadow-lg shadow-rose-200">
            <ClipboardCheck size={14}/> Emitir Atestado
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Paciente */}
        <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-base">📋</div>
          <div>
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Atestado Psicológico</p>
            <p className="text-xs text-slate-700 font-semibold">{patient.full_name}</p>
            {patient.cpf && <p className="text-[10px] text-slate-400">CPF: {patient.cpf}</p>}
          </div>
        </div>

        {/* Profissional */}
        <ProfCard professional={professional} color="bg-rose-50 border-rose-100 text-rose-800"/>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de Atestado" required>
            <select className={selectCls} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {['Comparecimento','Afastamento','Aptidão Psicológica','Declaração de Atendimento','Outro'].map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Data de Emissão" required>
            <input type="date" className={inputCls} value={form.data_emissao} onChange={e => set('data_emissao', e.target.value)}/>
          </Field>
        </div>

        {isAfastamento && (
          <div className="grid grid-cols-3 gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <Field label="Início do Afastamento">
              <input type="date" className={inputCls} value={form.afastamento_inicio} onChange={e => set('afastamento_inicio', e.target.value)}/>
            </Field>
            <Field label="Fim do Afastamento">
              <input type="date" className={inputCls} value={form.afastamento_fim} onChange={e => set('afastamento_fim', e.target.value)}/>
            </Field>
            <Field label="Nº de Dias">
              <input className={inputCls} type="number" min="1" placeholder="Ex: 7" value={form.dias_afastamento} onChange={e => set('dias_afastamento', e.target.value)}/>
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="CID-10 (opcional)">
            <input className={inputCls} placeholder="Ex: F41.1" value={form.cid} onChange={e => set('cid', e.target.value)}/>
          </Field>
          <Field label="Finalidade">
            <input className={inputCls} placeholder="Ex: Apresentar na empresa, escola..." value={form.finalidade} onChange={e => set('finalidade', e.target.value)}/>
          </Field>
        </div>

        <Field label="Observações / Recomendações">
          <textarea
            className={textareaCls}
            rows={3}
            placeholder="Recomendações de repouso, restrições de atividades..."
            value={form.observacoes}
            onChange={e => set('observacoes', e.target.value)}
          />
        </Field>

        <p className="text-[10px] text-slate-400 text-center">
          Salvo no prontuário como <span className="font-black text-emerald-600">Aprovado</span>. Os dados do profissional são incluídos automaticamente.
        </p>
      </div>
    </Modal>
  );
};
