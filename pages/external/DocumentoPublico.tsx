import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';
import { Alert, Button } from '../../components/UI';
import { sealOf } from '../../components/Documents/documentStatus';

interface PublicDoc {
  title: string; issued_at: string; version: number; signature_mode: string;
  has_pdf: boolean; html: string | null; expires_at: string;
}

/**
 * Página pública (sem login) para visualizar/baixar um documento enviado pelo profissional.
 * Abrir a página registra a visualização e o botão "Baixar PDF" registra o download: protocolo de recebimento.
 */
export const DocumentoPublico: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<PublicDoc | null>(null);
  const [error, setError] = useState('');
  const requested = useRef(false);
  const base = `${API_BASE_URL}/public/documents/${encodeURIComponent(token)}`;

  useEffect(() => {
    if (requested.current) return; // evita contar duas visualizações no StrictMode
    requested.current = true;
    fetch(base, { headers: { Accept: 'application/json' } })
      .then(async r => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || 'Link inválido ou expirado.');
        setDoc(data as PublicDoc);
      })
      .catch(e => setError(e?.message || 'Não foi possível abrir o documento.'));
  }, [base]);

  const seal = doc ? sealOf(doc.signature_mode) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><FileText size={16} /></div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-medium text-slate-800">{doc?.title || 'Documento'}</h1>
            <p className="text-[11px] text-slate-500">Documento enviado pelo seu profissional de saúde</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-3 px-4 py-4">
        {!doc && !error && (
          <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Abrindo documento...</div>
        )}
        {error && <Alert variant="error" title="Não foi possível abrir">{error}</Alert>}

        {doc && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="space-y-0.5 text-xs text-slate-600">
                <p>Emitido em {new Date(doc.issued_at).toLocaleDateString('pt-BR')}{doc.version > 1 ? ` (versão ${doc.version})` : ''}</p>
                {seal && <p className="flex items-center gap-1 text-[11px] text-slate-500"><ShieldCheck size={12} /> {seal.label}</p>}
                <p className="text-[11px] text-slate-500">Link válido até {new Date(doc.expires_at).toLocaleDateString('pt-BR')}.</p>
              </div>
              {doc.has_pdf && (
                <a href={`${base}/file?download=1`} download>
                  <Button variant="primary" size="md" iconLeft={<Download size={14} />}>Baixar PDF</Button>
                </a>
              )}
            </div>

            {doc.has_pdf ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <iframe title={doc.title} src={`${base}/file`} className="h-[75vh] w-full" />
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm" dangerouslySetInnerHTML={{ __html: doc.html || '' }} />
            )}

            <p className="text-center text-[11px] text-slate-500">
              Este documento contém dados de saúde protegidos por sigilo profissional e pela LGPD. Não compartilhe o link. A abertura e o download são registrados como confirmação de recebimento.
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default DocumentoPublico;
