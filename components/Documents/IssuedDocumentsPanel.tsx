import React, { useCallback, useEffect, useState } from 'react';
import { FileCheck2, Loader2 } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, Modal, ModalFooter } from '../UI';
import { api } from '../../services/api';
import { DocumentDeliveryPanel, type IssuedDoc } from './DocumentDeliveryPanel';
import { fmtDateTime, sealOf } from './documentStatus';

interface Row extends IssuedDoc { deliveries: number; views: number; downloads: number; first_viewed_at: string | null }

interface Props {
  /** Limita aos documentos de um paciente (use no prontuário/ficha do paciente). */
  patientId?: string | number | null;
  /** Muda para recarregar a lista (ex.: após emitir). */
  refreshKey?: number;
  patientPhone?: string;
  onNewVersion?: (doc: IssuedDoc) => void;
  /** Mostra o aviso discreto de guarda/LGPD. */
  showRetentionNotice?: boolean;
}

/** Documentos emitidos (lista com selo de assinatura e situação de entrega) e ficha com trilha/protocolo. */
export const IssuedDocumentsPanel: React.FC<Props> = ({ patientId, refreshKey = 0, patientPhone, onNewVersion, showRetentionNotice = true }) => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Row[]>('/doc-generator/doc-instances', patientId ? { patient_id: String(patientId) } : undefined);
      setRows(data || []); setError('');
    } catch (e: any) { setError(e?.message || 'Erro ao carregar os documentos emitidos.'); setRows([]); }
  }, [patientId]);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (!rows) return <div role="status" className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500"><Loader2 size={16} className="animate-spin" /> Carregando...</div>;

  return (
    <div className="space-y-3">
      {showRetentionNotice && (
        <Alert variant="info">
          Documentos emitidos, protocolos de entrega e evoluções ficam guardados sem possibilidade de edição por no mínimo 5 anos (dados de saúde sensíveis, LGPD).
          Para corrigir um documento, emita uma nova versão: a anterior é mantida.
        </Alert>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      {rows.length === 0 ? (
        <EmptyState icon={FileCheck2} title="Nenhum documento emitido" description="Os documentos emitidos aparecem aqui com a situação de entrega ao paciente." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {rows.map(r => {
            const seal = sealOf(r.signature_mode);
            return (
              <li key={r.id} className="flex min-w-0 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[13px] font-medium text-slate-800">{r.title}</p>
                    <p className="text-[11px] text-slate-500">{r.patient_name ? `${r.patient_name} - ` : ''}{fmtDateTime(r.issued_at)}{r.version > 1 ? ` - versão ${r.version}` : ''}</p>
                  </div>
                  <Badge color={seal.color} size="sm">{seal.label}</Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  {r.deliveries === 0 ? 'Não enviado ao paciente.' : r.first_viewed_at ? `Visualizado pelo paciente em ${fmtDateTime(r.first_viewed_at)} (${r.views}x).` : 'Enviado, aguardando acesso do paciente.'}
                  {r.downloads > 0 ? ` Baixado ${r.downloads}x.` : ''}
                </p>
                <div className="mt-auto flex justify-end">
                  <Button variant="outline" size="xs" onClick={() => setOpenId(r.id)}>Ficha, envio e protocolo</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        isOpen={openId !== null}
        onClose={() => setOpenId(null)}
        title="Documento emitido"
        size="lg"
        footer={<ModalFooter><Button variant="outline" onClick={() => setOpenId(null)}>Fechar</Button></ModalFooter>}
      >
        {openId !== null && (
          <DocumentDeliveryPanel
            docId={openId}
            patientPhone={patientPhone}
            onChanged={load}
            onNewVersion={onNewVersion ? (d) => { setOpenId(null); onNewVersion(d); } : undefined}
          />
        )}
      </Modal>
    </div>
  );
};
