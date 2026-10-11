import React, { useEffect, useRef, useState } from 'react';
import { Loader2, PenLine, Save, Trash2, Type, UploadCloud } from 'lucide-react';
import { Alert, Button, ConfirmModal, Input, PanelCard, Select, Switch, Tabs } from '../UI';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { SignaturePad } from './SignaturePad';
import {
  SIGNATURE_FONTS, ensureSignatureFonts, fileToSignature, typedNameToSignature, type SignatureImage,
} from './signatureImage';
import { infoFromResponse, invalidateSignature, loadSignature, setSignatureCache, type SignatureInfo } from './signatureStore';

const methodTabs = [
  { id: 'desenhar', label: 'Desenhar', icon: PenLine },
  { id: 'enviar', label: 'Enviar imagem', icon: UploadCloud },
  { id: 'digitar', label: 'Digitar o nome', icon: Type },
] as const;
type Method = typeof methodTabs[number]['id'];

const PaperPreview: React.FC<{ img: SignatureImage | null; empty: string }> = ({ img, empty }) => (
  <div className="flex min-h-[110px] items-center justify-center rounded-lg border border-slate-200 bg-white p-4" style={{ backgroundImage: 'linear-gradient(#fff,#fff)' }}>
    {img ? (
      <img src={img.dataUrl} alt="Pré-visualização da assinatura" className="max-h-[68px] max-w-full object-contain" />
    ) : (
      <span className="text-xs text-slate-400">{empty}</span>
    )}
  </div>
);

/** Aba "Assinatura" do Perfil: criar (desenhar / enviar imagem / digitar), pré-visualizar, salvar, substituir e excluir. */
export const SignatureSettings: React.FC<{ professionalName?: string }> = ({ professionalName }) => {
  const { pushToast } = useToast();
  const [info, setInfo] = useState<SignatureInfo | null>(null);
  const [method, setMethod] = useState<Method>('desenhar');
  const [draft, setDraft] = useState<SignatureImage | null>(null);
  const [typed, setTyped] = useState(professionalName || '');
  const [fontId, setFontId] = useState<string>(SIGNATURE_FONTS[0].id);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { ensureSignatureFonts(); loadSignature(true).then(setInfo); }, []);

  const font = SIGNATURE_FONTS.find(f => f.id === fontId) || SIGNATURE_FONTS[0];
  useEffect(() => {
    if (method !== 'digitar') return;
    let alive = true;
    if (!typed.trim()) { setDraft(null); return; }
    typedNameToSignature(typed, font.css).then(i => { if (alive) { setDraft(i); setError(''); } }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [method, typed, font.css]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setBusy(true); setError('');
    try { setDraft(await fileToSignature(f)); } catch (err: any) { setDraft(null); setError(err?.message || 'Não foi possível ler a imagem.'); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true); setError('');
    try {
      await api.put('/profile/signature', { signature_image: draft.dataUrl });
      const next: SignatureInfo = { image: draft, auto: info ? info.auto : true, updatedAt: new Date().toISOString() };
      setSignatureCache(next); setInfo(next); setDraft(null);
      pushToast('success', 'Assinatura salva', 'Ela será inserida nos documentos e PDFs conforme a opção abaixo.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar a assinatura.');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    setConfirmDelete(false);
    try {
      await api.delete('/profile/signature');
      invalidateSignature();
      const next: SignatureInfo = { image: null, auto: info ? info.auto : true, updatedAt: null };
      setSignatureCache(next); setInfo(next);
      pushToast('success', 'Assinatura excluída');
    } catch (err: any) { pushToast('error', 'Erro ao excluir a assinatura', err?.message || ''); }
  };

  const toggleAuto = async (v: boolean) => {
    if (!info) return;
    const prev = info;
    const next = { ...info, auto: v };
    setInfo(next); setSignatureCache(next);
    try { await api.put('/profile/signature', { signature_auto: v }); }
    catch { setInfo(prev); setSignatureCache(prev); pushToast('error', 'Não foi possível salvar a preferência'); }
  };

  if (!info) {
    return <div role="status" className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500"><Loader2 size={16} className="animate-spin" /> Carregando...</div>;
  }

  return (
    <div className="space-y-3">
      <Alert variant="info">
        A assinatura desenhada é uma assinatura eletrônica simples (imagem). Para validade jurídica plena (empresas, RH, órgãos públicos)
        assine o PDF com certificado ICP-Brasil ou Gov.br (prata/ouro) — veja o botão "Enviar PDF assinado" ao emitir o documento.
      </Alert>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <PanelCard title="Minha assinatura atual" description={info.updatedAt ? `Atualizada em ${new Date(info.updatedAt).toLocaleDateString('pt-BR')}` : 'Nenhuma assinatura cadastrada'} icon={PenLine}>
          <div className="space-y-3">
            <PaperPreview img={info.image} empty="Você ainda não criou sua assinatura." />
            <Switch
              checked={info.auto}
              onCheckedChange={toggleAuto}
              disabled={!info.image}
              label="Inserir minha assinatura automaticamente nos documentos e PDFs do prontuário"
              description={info.image ? 'Em cada documento você ainda pode desmarcar "Incluir minha assinatura".' : 'Crie sua assinatura para ativar esta opção.'}
            />
            {info.image && (
              <Button variant="outline" size="sm" iconLeft={<Trash2 size={14} />} onClick={() => setConfirmDelete(true)}>Excluir assinatura</Button>
            )}
            <p className="text-[11px] text-slate-500">
              A imagem fica guardada de forma privada na sua conta (não é pública) e aparece sobre a linha de assinatura com seu nome completo e registro profissional.
              Conforme a orientação do CRP, não é necessário rubricar todas as páginas nem usar carimbo em documentos digitais.
            </p>
          </div>
        </PanelCard>

        <PanelCard title={info.image ? 'Substituir assinatura' : 'Criar assinatura'} icon={PenLine}>
          <Tabs<Method> items={methodTabs} value={method} onChange={m => { setMethod(m); setDraft(null); setError(''); }} label="Como criar a assinatura">
            <div className="space-y-3 pt-3">
              {method === 'desenhar' && <SignaturePad onChange={setDraft} />}
              {method === 'enviar' && (
                <div className="space-y-2">
                  <div className="flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-3 text-center">
                    <UploadCloud size={18} className="text-slate-400" />
                    <p className="text-xs text-slate-500">Envie uma foto ou imagem da sua assinatura (PNG ou JPG, até 300 KB). O fundo branco é removido automaticamente.</p>
                    <Button variant="outline" size="xs" loading={busy} onClick={() => fileRef.current?.click()}>Selecionar imagem</Button>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onFile} />
                  </div>
                </div>
              )}
              {method === 'digitar' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input label="Nome" value={typed} onChange={e => setTyped(e.target.value)} maxLength={60} placeholder="Seu nome" />
                  <Select label="Estilo da letra" value={fontId} onChange={e => setFontId(e.target.value)} options={SIGNATURE_FONTS.map(f => ({ value: f.id, label: f.label }))} />
                </div>
              )}
              {error && <Alert variant="error">{error}</Alert>}
              <div className="space-y-1">
                <span className="block text-xs font-medium text-slate-600">Pré-visualização sobre papel branco</span>
                <PaperPreview img={draft} empty="A pré-visualização aparece aqui." />
              </div>
              <div className="flex justify-end">
                <Button variant="primary" size="sm" iconLeft={<Save size={14} />} onClick={save} disabled={!draft || saving} loading={saving}>
                  {info.image ? 'Substituir assinatura' : 'Salvar assinatura'}
                </Button>
              </div>
            </div>
          </Tabs>
        </PanelCard>
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Excluir assinatura"
        message="A imagem da assinatura será removida da sua conta. Documentos já emitidos não são alterados."
        confirmLabel="Excluir"
        variant="danger"
      />
    </div>
  );
};
