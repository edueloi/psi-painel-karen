import React, { useState, useEffect } from 'react';
import { Globe, Users, Link2, Copy, Check, Trash2, Plus, RefreshCw, Eye, EyeOff, Send, Clock, Shield, Calendar } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';

interface PortalToken {
  id: number;
  patient_id: number;
  patient_name?: string;
  label?: string;
  token: string;
  is_used: number;
  used_at?: string;
  expires_at?: string;
  allow_self_schedule: number;
  require_approval: number;
  created_at: string;
}

interface Patient {
  id: number;
  name?: string;
  full_name?: string;
}

export const PortalPaciente: React.FC = () => {
  const { pushToast } = useToast();
  const [tokens, setTokens] = useState<PortalToken[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patient_id: '',
    label: '',
    expires_in_days: 365,
    allow_self_schedule: true,
    require_approval: false,
    self_register: false,
  });

  const baseUrl = window.location.origin;

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const data = await api.get<PortalToken[]>('/patient-portal/tokens');
      setTokens(Array.isArray(data) ? data : []);
    } catch { setTokens([]); }
    finally { setLoading(false); }
  };

  const fetchPatients = async () => {
    try {
      const data = await api.get<any>('/patients?limit=500');
      const list = Array.isArray(data) ? data : (data?.patients || data?.data || []);
      setPatients(list);
    } catch { setPatients([]); }
  };

  useEffect(() => { fetchTokens(); fetchPatients(); }, []);

  const createToken = async () => {
    if (!form.patient_id) { pushToast('error', 'Selecione um paciente.'); return; }
    setCreating(true);
    try {
      await api.post('/patient-portal/tokens', {
        patient_id: parseInt(form.patient_id),
        label: form.label || undefined,
        expires_in_days: form.expires_in_days,
        allow_self_schedule: form.allow_self_schedule ? 1 : 0,
        require_approval: form.require_approval ? 1 : 0,
        self_register: form.self_register ? 1 : 0,
      });
      pushToast('success', 'Link de acesso criado!');
      setShowForm(false);
      setForm({ patient_id: '', label: '', expires_in_days: 365, allow_self_schedule: true, require_approval: false, self_register: false });
      fetchTokens();
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao criar link.');
    } finally { setCreating(false); }
  };

  const revokeToken = async (id: number) => {
    if (!confirm('Revogar este link? O paciente não poderá mais acessar.')) return;
    try {
      await api.delete(`/patient-portal/tokens/${id}`);
      pushToast('success', 'Link revogado.');
      fetchTokens();
    } catch { pushToast('error', 'Erro ao revogar.'); }
  };

  const copyLink = (token: string, id: number) => {
    const url = `${baseUrl}/portal/entrar/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      pushToast('success', 'Link copiado!');
    });
  };

  const sendWhatsApp = (token: PortalToken) => {
    const patient = patients.find(p => String(p.id) === String(token.patient_id));
    const name = token.patient_name || patient?.full_name || patient?.name || 'Paciente';
    const url = `${baseUrl}/portal/entrar/${token.token}`;
    const msg = encodeURIComponent(
      `Olá ${name}! Aqui está o link de acesso ao seu portal de paciente:\n\n${url}\n\nNele você pode agendar consultas, acompanhar seus pagamentos e muito mais. 😊`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const activeTokens = tokens.filter(t => t.is_used);
  const pendingTokens = tokens.filter(t => !t.is_used);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <Globe size={20} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">Portal do Paciente</h1>
              <p className="text-sm text-slate-400">Gerencie o acesso dos pacientes ao portal</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
        >
          <Plus size={15} /> Novo link de acesso
        </button>
      </div>

      {/* Info box */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
        <Shield size={18} className="text-indigo-500 mt-0.5 shrink-0" />
        <div className="text-sm text-indigo-700">
          <p className="font-bold mb-1">Como funciona o Portal do Paciente?</p>
          <p className="text-indigo-600">Gere um link exclusivo para cada paciente. Ao acessar o link, o paciente cria sua senha e pode: agendar consultas, ver pagamentos, baixar documentos e muito mais. O link fica ativo pelo período configurado.</p>
        </div>
      </div>

      {/* Form novo link */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-black text-slate-700">Criar novo link de acesso</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Paciente *</label>
              <select
                value={form.patient_id}
                onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Selecionar paciente...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Rótulo (opcional)</label>
              <input
                type="text"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Ex.: Acesso 2026"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Validade do link</label>
              <select
                value={form.expires_in_days}
                onChange={e => setForm(f => ({ ...f, expires_in_days: parseInt(e.target.value) }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value={7}>7 dias</option>
                <option value={30}>30 dias</option>
                <option value={90}>3 meses</option>
                <option value={365}>1 ano</option>
                <option value={3650}>Sem expiração (10 anos)</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.allow_self_schedule}
                onChange={e => setForm(f => ({ ...f, allow_self_schedule: e.target.checked }))}
                className="rounded accent-indigo-600" />
              <span className="text-sm text-slate-700 font-medium">Permitir auto-agendamento</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.require_approval}
                onChange={e => setForm(f => ({ ...f, require_approval: e.target.checked }))}
                className="rounded accent-indigo-600" />
              <span className="text-sm text-slate-700 font-medium">Exigir aprovação da psicóloga</span>
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Cancelar</button>
            <button onClick={createToken} disabled={creating}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-all">
              {creating ? 'Criando...' : 'Criar link'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total de links', value: tokens.length, icon: <Link2 size={16} />, color: 'bg-slate-100 text-slate-600' },
          { label: 'Ativos (usados)', value: activeTokens.length, icon: <Users size={16} />, color: 'bg-green-100 text-green-600' },
          { label: 'Aguardando uso', value: pendingTokens.length, icon: <Clock size={16} />, color: 'bg-amber-100 text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-xl font-black text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de tokens */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-700">Links de acesso</h3>
          <button onClick={fetchTokens} className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
        ) : tokens.length === 0 ? (
          <div className="p-8 text-center">
            <Globe size={32} className="text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Nenhum link criado ainda.</p>
            <p className="text-slate-300 text-xs mt-1">Crie o primeiro link para um paciente.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {tokens.map(t => {
              const patient = patients.find(p => String(p.id) === String(t.patient_id));
              const name = t.patient_name || patient?.full_name || patient?.name || `Paciente #${t.patient_id}`;
              const link = `${baseUrl}/portal/entrar/${t.token}`;
              const isExpired = t.expires_at && new Date(t.expires_at) < new Date();
              return (
                <div key={t.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black ${t.is_used ? 'bg-green-100 text-green-600' : isExpired ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-600'}`}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-700 text-sm truncate">{name}</p>
                    <p className="text-xs text-slate-400 truncate">{link}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.is_used ? 'bg-green-100 text-green-600' : isExpired ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-600'}`}>
                        {t.is_used ? 'ATIVO' : isExpired ? 'EXPIRADO' : 'AGUARDANDO'}
                      </span>
                      {t.allow_self_schedule ? (
                        <span className="text-[10px] text-indigo-500 font-bold">Auto-agendamento</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Só consulta</span>
                      )}
                      {t.label && <span className="text-[10px] text-slate-400">{t.label}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => copyLink(t.token, t.id)}
                      className="p-2 text-slate-400 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50"
                      title="Copiar link">
                      {copiedId === t.id ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                    </button>
                    <button onClick={() => sendWhatsApp(t)}
                      className="p-2 text-slate-400 hover:text-green-500 transition-colors rounded-lg hover:bg-green-50"
                      title="Enviar via WhatsApp">
                      <Send size={15} />
                    </button>
                    <button onClick={() => revokeToken(t.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      title="Revogar link">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
