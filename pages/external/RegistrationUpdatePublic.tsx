import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User, Mail, Phone, Briefcase, IdCard, MapPin, Home, ShieldCheck,
  Loader2, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Globe2,
  Users2, Wallet,
} from 'lucide-react';
import { api } from '../../services/api';
import { fetchAddressByCep, applyCepMask } from '../../src/lib/cep';
import { DatePicker } from '../../components/UI/DatePicker';
import { CountrySelect, maskPhone } from '../../components/UI/CountrySelect';
import logoUrl from '../../images/logo-sistema/logo.png';

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface PatientData {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  profession: string | null;
  cpf: string | null;
  birth_date: string | null;
  gender: string | null;
  street: string;
  house_number: string;
  neighborhood: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  health_plan: string | null;
  marital_status: string | null;
  education: string | null;
  nationality: string | null;
  has_children: boolean;
  children_count: number | null;
  minor_children_count: number | null;
  emergency_contacts: EmergencyContact[];
  is_payer: boolean;
  payer_name: string | null;
  payer_cpf: string | null;
  payer_phone: string | null;
}

const EMPTY_PATIENT: PatientData = {
  id: 0, name: '', email: '', phone: '', profession: '', cpf: '', birth_date: '', gender: '',
  street: '', house_number: '', neighborhood: '', city: '', state: '', zip_code: '', health_plan: '',
  marital_status: '', education: '', nationality: 'Brasileiro(a)',
  has_children: false, children_count: 0, minor_children_count: 0,
  emergency_contacts: [],
  is_payer: true, payer_name: '', payer_cpf: '', payer_phone: '',
};

const STEPS = [
  { key: 'pessoais', label: 'Dados pessoais' },
  { key: 'familia', label: 'Família' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'plano', label: 'Plano de saúde' },
];

const MARITAL_OPTIONS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'Amaziado/União Estável', 'Separado(a)'];
const EDUCATION_OPTIONS = [
  'Ensino Fundamental Incompleto', 'Ensino Fundamental Completo',
  'Ensino Médio Incompleto', 'Ensino Médio Completo',
  'Ensino Superior Incompleto', 'Ensino Superior Completo',
  'Pós-graduação', 'Mestrado', 'Doutorado',
];
const RELATIONSHIP_OPTIONS = [
  ['conjuge', 'Cônjuge'], ['mae', 'Mãe'], ['pai', 'Pai'], ['filho', 'Filho'], ['filha', 'Filha'],
  ['irmao', 'Irmão'], ['irma', 'Irmã'], ['avo', 'Avô/Avó'], ['tio', 'Tio(a)'], ['primo', 'Primo(a)'],
  ['amigo', 'Amigo(a)'], ['outro', 'Outro'],
];

function normalizeGender(raw: string | null | undefined): string {
  const v = (raw || '').trim().toLowerCase();
  if (['m', 'masculino', 'male'].includes(v)) return 'masculino';
  if (['f', 'feminino', 'female'].includes(v)) return 'feminino';
  if (!v) return '';
  return 'outro';
}

function applyCpfMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

const inputCls = 'w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#6D42F5] focus:ring-2 focus:ring-[#6D42F5]/15 transition-all duration-200';
const plainInputCls = 'w-full px-3.5 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#6D42F5] focus:ring-2 focus:ring-[#6D42F5]/15 transition-all duration-200';
const labelCls = 'text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block';

const Field: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div>
    <label className={labelCls}>{label}</label>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>
      {children}
    </div>
  </div>
);

export const RegistrationUpdatePublic: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');

  const [step, setStep] = useState<'loading' | 'error' | 'form' | 'submitted' | 'already_done'>('loading');
  const [error, setError] = useState('');
  const [professionalName, setProfessionalName] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState('BR');

  const [form, setForm] = useState<PatientData>(EMPTY_PATIENT);

  const setField = <K extends keyof PatientData>(k: K, v: PatientData[K]) => setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    document.title = 'Atualizar Cadastro | Plaelo';
    if (!token) { setError('Link inválido. Peça um novo link ao seu profissional.'); setStep('error'); return; }

    api.get(`/public-profile/cadastro/validate?t=${token}`)
      .then((data: any) => {
        setProfessionalName(data.professional_name || null);
        const patient = data.patient || {};
        setForm(prev => ({
          ...prev,
          ...patient,
          cpf: applyCpfMask(patient.cpf || ''),
          phone: maskPhone(patient.phone || '', 'BR'),
          gender: normalizeGender(patient.gender),
          nationality: patient.nationality || prev.nationality,
          emergency_contacts: Array.isArray(patient.emergency_contacts) && patient.emergency_contacts.length
            ? patient.emergency_contacts
            : [],
        }));
        if (data.already_submitted) {
          setStep('already_done');
        } else {
          setStep('form');
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.error || err?.message || 'Erro ao carregar formulário.';
        setError(msg);
        setStep('error');
      });
  }, [token]);

  const handleCepBlur = async () => {
    if (!form.zip_code) return;
    setCepLoading(true);
    const addr = await fetchAddressByCep(form.zip_code);
    if (addr) {
      setForm(prev => ({ ...prev, street: addr.street || prev.street, neighborhood: addr.neighborhood || prev.neighborhood, city: addr.city || prev.city, state: addr.state || prev.state }));
    }
    setCepLoading(false);
  };

  const contact = form.emergency_contacts[0] || { name: '', phone: '', relationship: '' };
  const setContact = (patch: Partial<EmergencyContact>) => {
    const next = { ...contact, ...patch };
    setField('emergency_contacts', (next.name || next.phone || next.relationship) ? [next] : []);
  };

  const goNext = () => setStepIndex(i => Math.min(STEPS.length - 1, i + 1));
  const goPrev = () => setStepIndex(i => Math.max(0, i - 1));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post(`/public-profile/cadastro/submit?t=${token}`, {
        name: form.name, email: form.email, phone: form.phone, profession: form.profession,
        cpf: form.cpf, birth_date: form.birth_date ? form.birth_date.slice(0, 10) : null, gender: form.gender,
        marital_status: form.marital_status, education: form.education, nationality: form.nationality,
        has_children: form.has_children,
        children_count: form.has_children ? form.children_count : 0,
        minor_children_count: form.has_children ? form.minor_children_count : 0,
        emergency_contacts: form.emergency_contacts,
        is_payer: form.is_payer,
        payer_name: form.is_payer ? null : form.payer_name,
        payer_cpf: form.is_payer ? null : form.payer_cpf,
        payer_phone: form.is_payer ? null : form.payer_phone,
        street: form.street, house_number: form.house_number, neighborhood: form.neighborhood,
        city: form.city, state: form.state, zip_code: form.zip_code,
        health_plan: form.health_plan,
      });
      setStep('submitted');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao salvar. Tente novamente.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={28} className="animate-spin text-[#6D42F5]" />
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-6" />
          <h1 className="text-xl font-black text-slate-800 mb-3">Não foi possível abrir o formulário</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (step === 'already_done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-slate-200">
            <CheckCircle2 size={28} className="text-slate-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Este cadastro já foi enviado</h1>
          <p className="text-slate-500 leading-relaxed">
            Você já atualizou seus dados por este link{professionalName ? ` com ${professionalName}` : ''}. Se precisar corrigir algo, peça um novo link.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(135deg, #120C2E, #6D42F5)' }}>
            <CheckCircle2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Cadastro atualizado!</h1>
          <p className="text-slate-500 leading-relaxed">
            Obrigado, {form.name.split(' ')[0]}. Seus dados foram enviados{professionalName ? ` para ${professionalName}` : ''} com sucesso.
          </p>
        </div>
      </div>
    );
  }

  const currentKey = STEPS[stepIndex].key;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 justify-center mb-8">
          <img src={logoUrl} alt="Plaelo" className="w-10 h-10 object-contain rounded-xl" />
          <span className="font-black text-xl tracking-tight text-slate-900">Plaelo</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-8 flex-wrap">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.key}>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={i < stepIndex
                      ? { background: '#0D9155', color: '#fff' }
                      : i === stepIndex
                        ? { background: '#6D42F5', color: '#fff' }
                        : { background: '#F1F5F9', color: '#94A3B8' }}
                  >
                    {i < stepIndex ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <span className={`text-[11px] font-bold ${i === stepIndex ? 'text-slate-800' : 'text-slate-400'} hidden sm:inline`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200 min-w-[10px]" />}
              </React.Fragment>
            ))}
          </div>

          <h2 className="text-xl font-black text-slate-900 mb-1">
            {professionalName ? `Cadastro — ${professionalName}` : 'Atualize seu cadastro'}
          </h2>
          <p className="text-sm text-slate-400 mb-6">Confira e atualize os dados que estiverem desatualizados.</p>

          {currentKey === 'pessoais' && (
            <div className="space-y-4">
              <Field label="Nome completo" icon={<User size={15} />}>
                <input className={inputCls} value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Seu nome completo" />
              </Field>
              <Field label="Profissão" icon={<Briefcase size={15} />}>
                <input className={inputCls} value={form.profession || ''} onChange={e => setField('profession', e.target.value)} placeholder="Sua profissão" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="E-mail" icon={<Mail size={15} />}>
                  <input type="email" className={inputCls} value={form.email || ''} onChange={e => setField('email', e.target.value)} placeholder="seu@email.com" />
                </Field>
                <div>
                  <label className={labelCls}>Telefone</label>
                  <div className="flex gap-1.5">
                    <CountrySelect value={phoneCountry} onChange={c => { setPhoneCountry(c); setField('phone', ''); }} />
                    <div className="relative flex-1">
                      <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input className={inputCls} value={form.phone || ''} onChange={e => setField('phone', maskPhone(e.target.value, phoneCountry))} placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="CPF" icon={<IdCard size={15} />}>
                  <input className={inputCls} value={form.cpf || ''} onChange={e => setField('cpf', applyCpfMask(e.target.value))} placeholder="000.000.000-00" />
                </Field>
                <div>
                  <label className={labelCls}>Data de nascimento</label>
                  <DatePicker
                    value={form.birth_date ? form.birth_date.slice(0, 10) : null}
                    onChange={v => setField('birth_date', v || '')}
                    placeholder="Selecione a data"
                  />
                </div>
              </div>
              <Field label="Gênero" icon={<User size={15} />}>
                <select className={inputCls} value={form.gender || ''} onChange={e => setField('gender', e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                  <option value="outro">Outro</option>
                  <option value="prefiro_nao_dizer">Prefiro não dizer</option>
                </select>
              </Field>
            </div>
          )}

          {currentKey === 'familia' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Estado civil</label>
                  <select className={plainInputCls} value={form.marital_status || ''} onChange={e => setField('marital_status', e.target.value)}>
                    <option value="">Selecione</option>
                    {MARITAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Escolaridade</label>
                  <select className={plainInputCls} value={form.education || ''} onChange={e => setField('education', e.target.value)}>
                    <option value="">Selecione</option>
                    {EDUCATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <Field label="Nacionalidade" icon={<Globe2 size={15} />}>
                <input className={inputCls} value={form.nationality || ''} onChange={e => setField('nationality', e.target.value)} placeholder="Ex: Brasileiro(a)" />
              </Field>

              <div className="border-t border-slate-100 pt-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4 accent-[#6D42F5]" checked={form.has_children} onChange={e => setField('has_children', e.target.checked)} />
                  <span className="text-sm font-semibold text-slate-700">Tem filhos</span>
                </label>
                {form.has_children && (
                  <div className="grid grid-cols-2 gap-4 mt-3 pl-7">
                    <div>
                      <label className={labelCls}>Quantos, ao todo</label>
                      <input type="number" min={0} className={plainInputCls} value={form.children_count ?? 0} onChange={e => setField('children_count', parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className={labelCls}>Quantos menores de idade</label>
                      <input type="number" min={0} className={plainInputCls} value={form.minor_children_count ?? 0} onChange={e => setField('minor_children_count', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <Users2 size={15} className="text-[#6D42F5]" /> Contato de emergência / parente
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input className={plainInputCls} placeholder="Nome" value={contact.name} onChange={e => setContact({ name: e.target.value })} />
                  <select className={plainInputCls} value={contact.relationship} onChange={e => setContact({ relationship: e.target.value })}>
                    <option value="">Parentesco</option>
                    {RELATIONSHIP_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input className={plainInputCls} placeholder="Telefone" value={contact.phone} onChange={e => setContact({ phone: maskPhone(e.target.value, 'BR') })} />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Wallet size={15} className="text-[#6D42F5]" /> Responsável financeiro
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs font-semibold text-slate-500">Sou eu mesmo(a)</span>
                    <button
                      type="button"
                      onClick={() => setField('is_payer', !form.is_payer)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${form.is_payer ? 'bg-[#6D42F5]' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 mt-0.5 transform rounded-full bg-white shadow transition-transform ${form.is_payer ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                </div>
                {!form.is_payer && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input className={plainInputCls} placeholder="Nome do responsável" value={form.payer_name || ''} onChange={e => setField('payer_name', e.target.value)} />
                    <input className={plainInputCls} placeholder="CPF do responsável" value={form.payer_cpf || ''} onChange={e => setField('payer_cpf', applyCpfMask(e.target.value))} />
                    <input className={plainInputCls} placeholder="Telefone do responsável" value={form.payer_phone || ''} onChange={e => setField('payer_phone', maskPhone(e.target.value, 'BR'))} />
                  </div>
                )}
              </div>
            </div>
          )}

          {currentKey === 'endereco' && (
            <div className="space-y-4">
              <Field label="CEP" icon={<MapPin size={15} />}>
                <input
                  className={inputCls}
                  value={form.zip_code || ''}
                  onChange={e => setField('zip_code', applyCepMask(e.target.value))}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {cepLoading && <Loader2 size={14} className="animate-spin text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />}
              </Field>
              <Field label="Rua / Logradouro" icon={<Home size={15} />}>
                <input className={inputCls} value={form.street || ''} onChange={e => setField('street', e.target.value)} placeholder="Rua, avenida…" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Número" icon={<Home size={15} />}>
                  <input className={inputCls} value={form.house_number || ''} onChange={e => setField('house_number', e.target.value)} placeholder="Número" />
                </Field>
                <Field label="Bairro" icon={<MapPin size={15} />}>
                  <input className={inputCls} value={form.neighborhood || ''} onChange={e => setField('neighborhood', e.target.value)} placeholder="Bairro" />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Cidade" icon={<MapPin size={15} />}>
                  <input className={inputCls} value={form.city || ''} onChange={e => setField('city', e.target.value)} placeholder="Cidade" />
                </Field>
                <Field label="Estado" icon={<MapPin size={15} />}>
                  <input className={inputCls} value={form.state || ''} onChange={e => setField('state', e.target.value.toUpperCase())} placeholder="UF" maxLength={2} />
                </Field>
              </div>
            </div>
          )}

          {currentKey === 'plano' && (
            <div className="space-y-4">
              <Field label="Plano de saúde / Convênio" icon={<ShieldCheck size={15} />}>
                <input className={inputCls} value={form.health_plan || ''} onChange={e => setField('health_plan', e.target.value)} placeholder="Ex: Particular, Unimed, Bradesco Saúde…" />
              </Field>
              <p className="text-xs text-slate-400">Deixe em branco se você é paciente particular.</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 border border-red-200 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mt-5">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex items-center justify-between mt-8">
            {stepIndex > 0 ? (
              <button onClick={goPrev} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition">
                <ArrowLeft size={15} /> Voltar
              </button>
            ) : <span />}

            {stepIndex < STEPS.length - 1 ? (
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition"
                style={{ background: '#6D42F5' }}
              >
                Próximo <ArrowRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition disabled:opacity-60"
                style={{ background: '#6D42F5' }}
              >
                {saving ? <><Loader2 size={15} className="animate-spin" /> Enviando...</> : <>Enviar <ArrowRight size={15} /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
