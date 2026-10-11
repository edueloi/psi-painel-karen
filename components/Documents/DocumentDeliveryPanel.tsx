import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, Copy, Download, FileCheck2, FilePlus2, Loader2, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { Alert, Badge, Button, ConfirmModal, PanelCard, Select } from '../UI';
import { API_BASE_URL, api } from '../../services/api';
import { getToken } from '../../services/tokenStorage';
import { useToast } from '../../contexts/ToastContext';
import { buildProtocolPdf, type ProtocolDoc } from './deliveryProtocol';
import { CHANNEL_LABEL, fmtDateTime, sealOf, trailLines, type DeliveryRow } from './documentStatus';
import { attachSignedPdf, createDelivery } from './issueDocument';
import { pdfFileName } from './renderDocumentPdf';

export interface IssuedDoc extends ProtocolDoc {
  patient_id: number | null; doc_type: string | null; replaces_id: number | null; archived_at: string | null; has_pdf: boolean; has_signed_pdf: boolean;
  signed_file_size: number | null; signed_attached_at: string | null;
}

const CHANNEL_OPTIONS = [
  { value: 'portal', label: 'Portal do paciente' },
  { value: 'link', label: 'Copiar link seguro' },
  { value: 'whatsapp', label: 'Abrir WhatsApp com mensagem pronta' },
] as const;

const short = (h?: string | null) => (h ? `${h.slice(0, 12)}...${h.slice(-6)}` : '-');

/** Baixa/abre um PDF protegido por login (Authorization) sem expor o token na URL. */
async function fetchPdfBlob(path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${getToken() || ''}` } });
  if (!res.ok) throw new Error('Não foi possível obter o PDF.');
  return res.blob();
}
const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

interface Props {
  docId: number;
  /** Telefone do paciente (só dígitos com DDI opcional) para abrir o WhatsApp direto na conversa. */
  patientPhone?: string;
  onChanged?: () => void;
  /** Quando informado, mostra "Emitir nova versão" (o documento emitido não é editável). */
  onNewVersion?: (doc: IssuedDoc) => void;
}

/** Ficha do documento emitido: selo de assinatura, hashes, envio ao paciente, PDF assinado externamente e trilha/protocolo. */
export const DocumentDeliveryPanel: React.FC<Props> = ({ docId, patientPhone, onChanged, onNewVersion }) => {
  const { pushToast } = useToast();
  const [doc, setDoc] = useState<IssuedDoc | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<string>('portal');
  const [busy, setBusy] = useState<string>('');
  const [link, setLink] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, t] = await Promise.all([
        api.get<IssuedDoc>(`/doc-generator/doc-instances/${docId}`),
        api.get<DeliveryRow[]>(`/doc-generator/doc-instances/${docId}/deliveries`),
      ]);
      setDoc(d); setDeliveries(t || []);
    } catch (e: any) { pushToast('error', 'Erro ao carregar o documento', e?.message || ''); }
    finally { setLoading(false); }
  }, [docId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setLink(null); load(); }, [load]);

  if (loading && !doc) return <div role="status" className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500"><Loader2 size={16} className="animate-spin" /> Carregando...</div>;
  if (!doc) return <Alert variant="error">Documento não encontrado.</Alert>;
  const seal = sealOf(doc.signature_mode);
  const official = doc.signed_file_hash || doc.pdf_hash;

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); pushToast('success', 'Link copiado'); } catch { pushToast('warning', 'Não foi possível copiar', 'Selecione e copie o link manualmente.'); }
  };

  const send = async () => {
    if (busy) return;
    setBusy('send');
    try {
      const r = await createDelivery(doc.id, channel as 'link' | 'whatsapp' | 'portal');
      if (r.channel === 'portal') {
        pushToast('success', 'Documento disponibilizado no portal do paciente', 'O acesso do paciente será registrado como protocolo.');
        setLink(null);
      } else if (r.url) {
        setLink(r.url);
        if (r.channel === 'whatsapp') {
          const digits = (patientPhone || '').replace(/\D/g, '');
          const msg = `Olá! Segue o link seguro para visualizar e baixar o seu documento "${doc.title}": ${r.url}\n(Válido até ${new Date(r.expires_at).toLocaleDateString('pt-BR')}.)`;
          window.open(`https://wa.me/${digits.length >= 10 ? (digits.length <= 11 ? `55${digits}` : digits) : ''}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
        } else {
          await copy(r.url);
        }
      }
      await load(); onChanged?.();
    } catch (e: any) { pushToast('error', 'Não foi possível registrar o envio', e?.message || ''); }
    finally { setBusy(''); }
  };

  const onSigned = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setBusy('signed');
    try {
      await attachSignedPdf(doc.id, f);
      pushToast('success', 'PDF assinado anexado', 'Ele passa a ser a versão oficial do documento.');
      await load(); onChanged?.();
    } catch (err: any) { pushToast('error', 'Não foi possível anexar o PDF', err?.message || ''); }
    finally { setBusy(''); }
  };

  const downloadPdf = async () => {
    setBusy('pdf');
    try { saveBlob(await fetchPdfBlob(`/doc-generator/doc-instances/${doc.id}/file`), pdfFileName(doc.title, doc.patient_name || undefined)); }
    catch (e: any) { pushToast('error', 'PDF indisponível', e?.message || 'Este documento não possui PDF guardado.'); }
    finally { setBusy(''); }
  };

  const downloadProtocol = async () => {
    setBusy('protocol');
    try { (await buildProtocolPdf(doc, deliveries)).save(pdfFileName('Protocolo de entrega', doc.title)); }
    catch { pushToast('error', 'Erro ao gerar o protocolo'); }
    finally { setBusy(''); }
  };

  const archive = async () => {
    setConfirmArchive(false);
    try { await api.post(`/doc-generator/doc-instances/${doc.id}/archive`, {}); pushToast('success', 'Documento arquivado'); await load(); onChanged?.(); }
    catch (e: any) { pushToast('error', 'Erro ao arquivar', e?.message || ''); }
  };

  return (
    <div className="space-y-3">
      <PanelCard
        title={doc.title}
        description={`Emitido em ${fmtDateTime(doc.issued_at)}${doc.issuer_name ? ` por ${doc.issuer_name}` : ''}${doc.patient_name ? ` - ${doc.patient_name}` : ''}`}
        icon={FileCheck2}
        action={<div className="flex flex-wrap items-center gap-1.5">{doc.version > 1 && <Badge size="sm">Versão {doc.version}</Badge>}<Badge color={seal.color} size="sm" icon={<ShieldCheck size={12} />}>{seal.label}</Badge></div>}
      >
        <div className="space-y-2 text-[11px] text-slate-500">
          <p>{seal.hint}</p>
          {doc.replaces_id && <p>Esta versão substitui o documento nº {doc.replaces_id}, que foi mantido.</p>}
          <p className="break-all">SHA-256 do conteúdo: <span className="text-slate-700">{short(doc.content_hash)}</span>{official ? <> - PDF oficial: <span className="text-slate-700">{short(official)}</span></> : null}</p>
          {doc.has_signed_pdf && doc.signed_attached_at && <p>PDF assinado anexado em {fmtDateTime(doc.signed_attached_at)}{doc.signed_file_size ? ` (${Math.round(doc.signed_file_size / 1024)} KB)` : ''}.</p>}
          <p>Guarda mínima até {new Date(doc.retention_until).toLocaleDateString('pt-BR')}. O documento emitido não pode ser editado nem excluído antes disso; para corrigir, emita uma nova versão.</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" iconLeft={<Download size={14} />} onClick={downloadPdf} loading={busy === 'pdf'} disabled={!doc.has_pdf && !doc.has_signed_pdf}>Baixar PDF</Button>
          {onNewVersion && <Button variant="outline" size="sm" iconLeft={<FilePlus2 size={14} />} onClick={() => onNewVersion(doc)}>Emitir nova versão</Button>}
          {!doc.archived_at && <Button variant="ghost" size="sm" iconLeft={<Archive size={14} />} onClick={() => setConfirmArchive(true)}>Arquivar</Button>}
        </div>
      </PanelCard>

      <PanelCard title="Assinatura digital externa" description="ICP-Brasil ou Gov.br (prata/ouro)" icon={ShieldCheck}>
        <div className="space-y-2">
          <p className="text-xs text-slate-600">O sistema não assina com certificado. Baixe o PDF, assine-o fora do sistema e anexe aqui o arquivo já assinado: ele vira a versão oficial enviada ao paciente.</p>
          <Button variant="outline" size="sm" iconLeft={<ShieldCheck size={14} />} onClick={() => fileRef.current?.click()} loading={busy === 'signed'}>Enviar PDF assinado (ICP-Brasil / Gov.br)</Button>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onSigned} />
        </div>
      </PanelCard>

      <PanelCard title="Enviar ao paciente" description="Cada envio gera um link com token único e registra o acesso." icon={Send}>
        {!doc.patient_id ? (
          <Alert variant="warning">Vincule o documento a um paciente cadastrado para enviá-lo.</Alert>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <Select label="Canal" value={channel} onChange={e => setChannel(e.target.value)} options={CHANNEL_OPTIONS.map(o => ({ value: o.value, label: o.label }))} wrapperClassName="min-w-[220px] flex-1" />
              <Button variant="primary" size="md" iconLeft={channel === 'whatsapp' ? <MessageCircle size={14} /> : <Send size={14} />} onClick={send} loading={busy === 'send'} disabled={!doc.has_pdf && !doc.has_signed_pdf}>Enviar</Button>
            </div>
            {!doc.has_pdf && !doc.has_signed_pdf && <Alert variant="warning">Este documento antigo não tem PDF guardado. Emita uma nova versão para poder enviá-lo.</Alert>}
            {link && (
              <div className="space-y-1">
                <Alert variant="info">O link abaixo é mostrado apenas agora (somente o hash dele fica guardado). Copie ou envie ao paciente.</Alert>
                <div className="flex items-center gap-2">
                  <input readOnly value={link} aria-label="Link seguro" onFocus={e => e.currentTarget.select()} className="h-[34px] min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700" />
                  <Button variant="outline" size="sm" iconLeft={<Copy size={14} />} onClick={() => copy(link)}>Copiar</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </PanelCard>

      <PanelCard
        title="Protocolo de entrega"
        description="Registros de envio, visualização e download (não editáveis)"
        icon={FileCheck2}
        action={<Button variant="outline" size="xs" iconLeft={<Download size={14} />} onClick={downloadProtocol} loading={busy === 'protocol'}>Baixar protocolo de entrega (PDF)</Button>}
      >
        {deliveries.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhum envio registrado.</p>
        ) : (
          <ul className="space-y-2">
            {deliveries.map(d => (
              <li key={d.id} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700">
                <div className="mb-1 flex flex-wrap items-center gap-2"><Badge size="sm">{CHANNEL_LABEL[d.channel] || d.channel}</Badge>{d.first_viewed_at ? <Badge color="success" size="sm">Recebido</Badge> : <Badge color="warning" size="sm">Aguardando acesso</Badge>}</div>
                {trailLines(d).map((l, i) => <p key={i}>{l}</p>)}
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <ConfirmModal
        isOpen={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={archive}
        title="Arquivar documento"
        message="O documento sai da lista principal, mas continua guardado com o protocolo de entrega."
        confirmLabel="Arquivar"
        variant="primary"
      />
    </div>
  );
};
