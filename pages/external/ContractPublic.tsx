import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { api, getStaticUrl } from '../../services/api';
import {
  CheckCircle, ShieldCheck, AlertTriangle, ArrowRight, Loader2,
  FileSignature, Eraser, PenLine,
} from 'lucide-react';

interface ContractData {
  send_id: number;
  contract_type: 'online' | 'presencial';
  title: string;
  html: string;
  patient_name: string;
  patient_cpf: string;
  professional: {
    name: string; specialty?: string; crp?: string;
    company_name?: string; avatar_url?: string; clinic_logo_url?: string;
  } | null;
  already_signed: boolean;
  signature: { signer_name: string; signer_cpf: string; signed_at: string } | null;
}

export const ContractPublic: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');

  const [step, setStep] = useState<'loading' | 'error' | 'already_signed' | 'review' | 'signing' | 'submitted'>('loading');
  const [data, setData] = useState<ContractData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerCpf, setSignerCpf] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const sigRef = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    if (!token) { setError('Link inválido. Solicite um novo link ao(à) seu(sua) psicólogo(a).'); setStep('error'); return; }

    api.get(`/public-profile/contrato/validate?t=${token}`)
      .then((res: any) => {
        setData(res);
        setSignerName(res.patient_name || '');
        setSignerCpf(res.patient_cpf || '');
        setStep(res.already_signed ? 'already_signed' : 'review');
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.error || err?.message || 'Erro ao carregar contrato.';
        setError(msg);
        setStep('error');
      });
  }, [token]);

  useEffect(() => {
    document.title = data ? `${data.title} | PsiFlux` : 'Contrato de Psicoterapia | PsiFlux';
  }, [data]);

  const clearSignature = () => {
    sigRef.current?.clear();
    setHasStroke(false);
  };

  const handleSubmit = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) { setError('Por favor, desenhe sua assinatura antes de confirmar.'); return; }
    if (!signerName.trim() || !signerCpf.trim()) { setError('Preencha seu nome completo e CPF para confirmar a assinatura.'); return; }
    setSubmitting(true); setError(null);
    try {
      const signatureImage = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      await api.post(`/public-profile/contrato/sign?t=${token}`, {
        signer_name: signerName.trim(),
        signer_cpf: signerCpf.trim(),
        signature_image: signatureImage,
      });
      setStep('submitted');
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setStep('already_signed');
      } else {
        setError(e?.response?.data?.error || 'Erro ao enviar assinatura. Tente novamente.');
      }
    } finally { setSubmitting(false); }
  };

  const prof = data?.professional;

  /* ── LOADING ── */
  if (step === 'loading') return (
    <div className="min-h-screen bg-[#fafaff] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-200">
          <Loader2 size={28} className="text-white animate-spin" />
        </div>
        <p className="text-slate-500 font-bold text-sm">Carregando seu contrato...</p>
      </div>
    </div>
  );

  /* ── ERROR ── */
  if (step === 'error') return (
    <div className="min-h-screen bg-[#fafaff] flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl p-8 sm:p-12 max-w-md w-full space-y-6 text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-[1.8rem] flex items-center justify-center mx-auto">
          <AlertTriangle size={36} className="text-rose-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Link Inválido</h2>
          <p className="text-slate-500 font-medium leading-relaxed">{error}</p>
        </div>
        <div className="pt-4 flex items-center justify-center gap-2 text-slate-300">
          <ShieldCheck size={16} />
          <span className="text-[11px] font-black uppercase tracking-widest">Segurança & Privacidade PsiFlux</span>
        </div>
      </div>
    </div>
  );

  /* ── ALREADY SIGNED ── */
  if (step === 'already_signed') return (
    <div className="min-h-screen bg-[#fafaff] flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl p-8 sm:p-12 max-w-md w-full space-y-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto border border-emerald-100">
          <CheckCircle size={48} className="text-emerald-500" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-800">Já Assinado!</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Este contrato já foi assinado{data?.signature ? ` em ${new Date(data.signature.signed_at).toLocaleDateString('pt-BR')}` : ''}.
            <br /><br />
            Se precisar de uma via ou tiver dúvidas, entre em contato diretamente com seu(sua) psicólogo(a).
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-slate-300">
          <ShieldCheck size={16} />
          <span className="text-[11px] font-black uppercase tracking-widest">Assinatura Eletrônica PsiFlux</span>
        </div>
      </div>
    </div>
  );

  /* ── SUBMITTED ── */
  if (step === 'submitted') return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl p-8 sm:p-12 max-w-lg w-full space-y-8 sm:space-y-10 text-center animate-in fade-in zoom-in duration-700">
        <div className="relative">
          <div className="w-24 h-24 sm:w-28 sm:h-28 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-indigo-200">
            <FileSignature size={48} className="text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <CheckCircle size={20} className="text-white" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight leading-none">Contrato assinado!</h2>
          <p className="text-slate-500 font-medium leading-relaxed text-base">
            Sua assinatura foi registrada com segurança. Seu(sua) psicólogo(a) foi notificado(a) automaticamente.
          </p>
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-left space-y-2">
            <p className="text-indigo-700 font-black text-xs uppercase tracking-widest">Próximos passos</p>
            <ul className="space-y-2">
              {[
                'A nota fiscal referente aos serviços é emitida e enviada ao final de cada mês',
                'O pagamento das sessões é sempre antecipado, conforme combinado no contrato',
                'A cada 3 meses você receberá os inventários BDI-II e BAI para acompanhamento do seu progresso',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-indigo-700 font-medium">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-center gap-2 opacity-40">
          <ShieldCheck size={14} className="text-indigo-400" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assinatura Eletrônica • Criptografia PsiFlux</span>
        </div>
      </div>
    </div>
  );

  /* ── REVIEW ── */
  if (step === 'review' && data) return (
    <div className="min-h-screen bg-[#fafaff] font-sans pb-16">
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-slate-800 text-white py-10 sm:py-16 px-4 sm:px-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-20 w-96 h-96 bg-white/5 rounded-full blur-[120px]" />
        <div className="max-w-2xl mx-auto space-y-5 sm:space-y-6 relative z-10 text-center">
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20 w-fit mx-auto">
            <FileSignature size={16} className="text-indigo-200" />
            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-50">Assinatura Eletrônica Segura</span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight px-2">{data.title}</h1>
          {prof && (
            <div className="flex items-center gap-4 pt-2 justify-center">
              {prof.clinic_logo_url ? (
                <img src={getStaticUrl(prof.clinic_logo_url)} alt={prof.name} className="w-12 h-12 rounded-xl bg-white/10 object-contain p-1 border-2 border-white/20" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/20 border-2 border-white/30 flex items-center justify-center font-black text-xl">{prof.name?.[0]}</div>
              )}
              <div className="text-left">
                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Profissional responsável</p>
                <p className="font-black text-lg">{prof.name}</p>
                {prof.crp && <p className="text-indigo-200 text-xs font-bold">CRP {prof.crp}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 -mt-6 sm:-mt-8 relative z-10">
        <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-xl border border-slate-100 p-4 sm:p-8 space-y-6">
          <div
            className="prose prose-sm sm:prose-base max-w-none text-slate-700 leading-relaxed max-h-[50vh] overflow-y-auto pr-1 sm:pr-2 border border-slate-100 rounded-2xl p-4 sm:p-6 bg-slate-50/50"
            dangerouslySetInnerHTML={{ __html: data.html }}
          />

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setAgreed(a => !a)}
              className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                agreed ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:border-indigo-100'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                agreed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
              }`}>
                {agreed && <CheckCircle size={14} className="text-white" />}
              </div>
              <p className={`text-sm font-medium leading-relaxed ${agreed ? 'text-indigo-700' : 'text-slate-600'}`}>
                Li e concordo com todos os termos deste contrato de prestação de serviços psicológicos.
              </p>
            </button>
          </div>

          <button
            onClick={() => setStep('signing')}
            disabled={!agreed}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3"
          >
            <ArrowRight size={20} /> Continuar para assinatura
          </button>
        </div>
      </div>
    </div>
  );

  /* ── SIGNING ── */
  if (step === 'signing' && data) return (
    <div className="min-h-screen bg-[#fafaff] font-sans py-8 sm:py-16 px-3 sm:px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100">
            <PenLine size={24} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Confirme sua assinatura</h2>
          <p className="text-slate-500 text-sm font-medium">Preencha seus dados e desenhe sua assinatura abaixo.</p>
        </div>

        <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-xl border border-slate-100 p-5 sm:p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Nome completo</label>
            <input
              type="text" value={signerName} onChange={e => setSignerName(e.target.value)}
              className="w-full h-12 px-4 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">CPF</label>
            <input
              type="text" value={signerCpf} onChange={e => setSignerCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full h-12 px-4 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Sua assinatura</label>
              <button type="button" onClick={clearSignature} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors">
                <Eraser size={13} /> Limpar
              </button>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 overflow-hidden touch-none">
              <SignatureCanvas
                ref={sigRef}
                penColor="#312e81"
                canvasProps={{ className: 'w-full h-48 sm:h-56' }}
                onBegin={() => setHasStroke(true)}
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center">Desenhe com o dedo (celular) ou o mouse (computador)</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !hasStroke || !signerName.trim() || !signerCpf.trim()}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3"
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <FileSignature size={20} />}
            {submitting ? 'Enviando...' : 'Confirmar assinatura'}
          </button>

          <button onClick={() => setStep('review')} className="w-full text-center text-slate-400 text-xs font-medium underline underline-offset-2 hover:text-slate-600 transition">
            Voltar para revisar o contrato
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 opacity-40">
          <ShieldCheck size={14} className="text-indigo-400" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assinatura Eletrônica • Criptografia PsiFlux</span>
        </div>
      </div>
    </div>
  );

  return null;
};
