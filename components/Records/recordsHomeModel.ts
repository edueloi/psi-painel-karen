export interface HomePatient {
  id: string | number;
  full_name: string;
  status?: string;
  cpf?: string;
}

export interface HomeRecord {
  id: string; patient_id: string; patient_name?: string;
  record_type: string; title: string; status: string;
  created_at: string; updated_at?: string; start_time?: string;
  professional_name?: string; ai_status?: string; content?: string;
}

export const HOME_RECORD_TYPES: Record<string, string> = {
  Anamnese: 'Anamnese', Avaliacao: 'Avaliação', Evolucao: 'Evolução',
  Plano: 'Plano terapêutico', Relatorio: 'Relatório',
  Encaminhamento: 'Encaminhamento', Atestado: 'Atestado',
};

export const normalizeHomeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

// A data de referência do prontuário é salva em created_at (não é a data da edição).
// Datas sem horário não devem passar por UTC, que deslocaria o dia no Brasil.
export function homeRecordDay(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const homeDateLabel = (value?: string) => homeRecordDay(value).split('-').reverse().join('/') || 'Não informada';
export const homeRecordStamp = (record: HomeRecord) => new Date(record.updated_at || record.created_at).getTime() || 0;

export interface HomeFilters { search: string; type: string; status: string; from: string; to: string; }

export function filterHomeRecords(records: HomeRecord[], patients: HomePatient[], filters: HomeFilters): HomeRecord[] {
  const names = new Map(patients.map(patient => [String(patient.id), patient.full_name]));
  const cpfs = new Map(patients.map(patient => [String(patient.id), (patient.cpf || '').replace(/\D/g, '')]));
  const query = normalizeHomeSearch(filters.search);
  return records.filter(record => {
    const day = homeRecordDay(record.created_at);
    const name = names.get(String(record.patient_id)) || record.patient_name || '';
    const haystack = normalizeHomeSearch([name, record.title, HOME_RECORD_TYPES[record.record_type] || record.record_type, record.professional_name || ''].join(' '));
    const cpfQuery = query.replace(/\D/g, '');
    const matchesCpf = /^[\d.\-\s]+$/.test(query) && !!cpfQuery && (cpfs.get(String(record.patient_id)) || '').includes(cpfQuery);
    return (!query || haystack.includes(query) || matchesCpf) && (!filters.type || record.record_type === filters.type)
      && (!filters.status || record.status === filters.status)
      && (!filters.from || day >= filters.from) && (!filters.to || (!!day && day <= filters.to));
  }).sort((a, b) => homeRecordStamp(b) - homeRecordStamp(a) || String(b.id).localeCompare(String(a.id), undefined, { numeric: true }));
}

export function groupHomeRecords(records: HomeRecord[]) {
  const groups = new Map<string, HomeRecord[]>();
  for (const record of [...records].sort((a, b) => homeRecordStamp(b) - homeRecordStamp(a))) {
    const id = String(record.patient_id);
    const group = groups.get(id) || [];
    group.push(record);
    groups.set(id, group);
  }
  return groups;
}

export const isHomePatientActive = (patient: HomePatient) => !patient.status || ['ativo', 'active', 'em atendimento'].includes(normalizeHomeSearch(patient.status));
