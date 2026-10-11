import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, FileText, FileUp, Loader2, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { Alert } from '../UI/Alert';
import { Button } from '../UI/Button';
import { Input, Select } from '../UI/Input';
import { Modal, ModalFooter } from '../UI/Modal';

type RecordType = 'Anamnese' | 'Avaliacao' | 'Evolucao';

export interface ImportedClinicalFile {
  recordType: RecordType;
  date: string;
  draft: string;
  organized: Record<string, unknown>;
  reviewPoints: string[];
  attachment: { file_name: string; file_url: string; file_type: string; file_size: number };
}

interface Props {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onPrepared: (data: ImportedClinicalFile) => void;
}

const TYPES: Array<{ value: RecordType; label: string; hint: string }> = [
  { value: 'Anamnese', label: 'Anamnese', hint: 'Entrevista inicial, história e contexto do paciente.' },
  { value: 'Avaliacao', label: 'Avaliação', hint: 'Dados de avaliação clínica, instrumentos e hipóteses a revisar.' },
  { value: 'Evolucao', label: 'Evolução', hint: 'Registro de uma sessão ou atendimento em uma data específica.' },
];

const localToday = () => new Date().toLocaleDateString('en-CA');

/** Importa uma fonte clínica para revisão. O arquivo nunca vira prontuário aprovado automaticamente. */
export const ImportClinicalFileModal: React.FC<Props> = ({ patientId, patientName, onClose, onPrepared }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<RecordType>('Evolucao');
  const [date, setDate] = useState(localToday());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || file.type !== 'application/pdf') { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selectedType = useMemo(() => TYPES.find(t => t.value === type)!, [type]);
  const chooseFile = (next?: File) => {
    setError('');
    if (!next) return;
    const isPdf = next.type === 'application/pdf' || /\.pdf$/i.test(next.name);
    const isDocx = next.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.docx$/i.test(next.name);
    if (!isPdf && !isDocx) { setError('Envie um PDF ou DOCX. Arquivos .doc antigos não são suportados.'); return; }
    if (next.size > 10 * 1024 * 1024) { setError('O arquivo para leitura deve ter no máximo 10 MB.'); return; }
    setFile(next);
  };

  const importFile = async () => {
    if (!file) { setError('Escolha o arquivo que será importado.'); return; }
    if (!date) { setError('Informe a data do atendimento ou da coleta.'); return; }
    setBusy(true); setError('');
    try {
      // O original fica nos Documentos do paciente, antes de a IA receber apenas o texto extraído.
      const form = new FormData();
      form.append('file', file);
      form.append('patient_id', patientId);
      form.append('category', 'Prontuário');
      form.append('title', `${selectedType.label} importada — ${file.name}`);
      const uploaded = await api.post<any>('/uploads', form);
      const extracted = await api.post<any>('/medical-records/import-file-text', { patient_id: patientId, upload_id: uploaded.id });
      const draft = String(extracted?.text || '').trim();
      if (!draft) throw new Error('Não foi possível obter texto do arquivo. Se ele for escaneado, digite ou cole o conteúdo no registro.');
      const ai = await api.post<any>('/medical-records/organize-ai', { patient_id: patientId, record_type: type, draft_content: draft });
      onPrepared({
        recordType: type,
        date,
        draft,
        organized: ai?.organized || {},
        reviewPoints: Array.isArray(ai?.review_points) ? ai.review_points : [],
        attachment: {
          file_name: uploaded.file_name || file.name,
          file_url: uploaded.file_url,
          file_type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
          file_size: file.size,
        },
      });
    } catch (e: any) {
      setError(e?.data?.error || e?.response?.data?.error || e?.message || 'Não foi possível importar o arquivo.');
    } finally { setBusy(false); }
  };

  return (
    <Modal
      isOpen
      onClose={busy ? () => {} : onClose}
      title="Importar arquivo para o prontuário"
      subtitle={`Paciente: ${patientName}. O original será guardado em Documentos e o texto será preparado para revisão.`}
      size="xl"
      footer={<ModalFooter><Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancelar</Button><Button variant="primary" size="sm" iconLeft={busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} loading={busy} onClick={importFile}>Ler e organizar com IA</Button></ModalFooter>}
    >
      <div className="space-y-4">
        <Alert variant="info" title="Revisão obrigatória">
          A IA apenas organiza o texto extraído. Confira todas as informações, principalmente riscos, hipóteses e datas, antes de salvar ou aprovar o registro.
        </Alert>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Registrar como" value={type} onChange={e => setType(e.target.value as RecordType)}>
            {TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Input label={type === 'Evolucao' ? 'Data do atendimento' : 'Data de referência'} type="date" value={date} onChange={e => setDate(e.target.value)} iconLeft={<CalendarDays size={14} />} />
        </div>
        <p className="text-[11px] text-slate-500">{selectedType.hint}</p>
        <input ref={fileRef} className="hidden" type="file" accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" onChange={e => chooseFile(e.target.files?.[0])} />
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><FileText size={18} /></div>
              <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{file?.name || 'Nenhum arquivo selecionado'}</p><p className="text-[11px] text-slate-500">PDF ou DOCX · até 10 MB</p></div>
            </div>
            <Button variant="outline" size="sm" iconLeft={<FileUp size={14} />} onClick={() => fileRef.current?.click()} disabled={busy}>{file ? 'Trocar arquivo' : 'Escolher arquivo'}</Button>
          </div>
        </div>
        {previewUrl && <iframe title="Pré-visualização do PDF importado" src={previewUrl} className="h-64 w-full rounded-lg border border-slate-200 bg-white" />}
        {file && !previewUrl && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">O conteúdo do DOCX será exibido como texto após a leitura. O arquivo original continuará disponível nos Documentos do paciente.</p>}
        {error && <Alert variant="error">{error}</Alert>}
      </div>
    </Modal>
  );
};
