import { describe, it, expect } from 'vitest';
import { filterHomeRecords, groupHomeRecords, homeRecordDay, isHomePatientActive, type HomeRecord } from './recordsHomeModel';

const patients = [{ id: 1, full_name: 'João da Silva', status: 'Ativo' }, { id: 2, full_name: 'Maria Souza', status: 'inactive' }];
const records: HomeRecord[] = [
  { id: '1', patient_id: '1', patient_name: 'Nome antigo', record_type: 'Avaliacao', title: 'Avaliação — 10/10/2026', status: 'Rascunho', created_at: '2026-10-10', updated_at: '2026-10-12T12:00:00', professional_name: 'Ana Psicóloga' },
  { id: '2', patient_id: '2', record_type: 'Evolucao', title: 'Sessão', status: 'Aprovado', created_at: '2026-10-11', updated_at: '2026-10-11T14:00:00' },
];
const defaults = { search: '', type: '', status: '', from: '', to: '' };

describe('Central do prontuário', () => {
  it('busca o nome atual do paciente sem depender do título e sem acentos', () => {
    expect(filterHomeRecords(records, patients, { ...defaults, search: 'joao' }).map(r => r.id)).toEqual(['1']);
    expect(filterHomeRecords(records, patients, { ...defaults, search: 'avaliacao' }).map(r => r.id)).toEqual(['1']);
    expect(filterHomeRecords(records, patients, { ...defaults, search: 'psicologa' }).map(r => r.id)).toEqual(['1']);
  });
  it('filtra por data de referência, não pela data de atualização', () => {
    expect(filterHomeRecords(records, patients, { ...defaults, from: '2026-10-10', to: '2026-10-10' }).map(r => r.id)).toEqual(['1']);
    expect(filterHomeRecords(records, patients, { ...defaults, from: '2026-10-12' })).toHaveLength(0);
  });
  it('busca CPF com e sem pontuação sem confundir títulos numéricos', () => {
    const identified = [{ ...patients[0], cpf: '123.456.789-00' }, patients[1]];
    expect(filterHomeRecords(records, identified, { ...defaults, search: '12345678900' }).map(r => r.id)).toEqual(['1']);
    expect(filterHomeRecords(records, identified, { ...defaults, search: '123.456.789-00' }).map(r => r.id)).toEqual(['1']);
    expect(filterHomeRecords(records, identified, { ...defaults, search: 'paciente 123' })).toHaveLength(0);
  });
  it('combina tipo e situação e ordena por última atualização', () => {
    expect(filterHomeRecords(records, patients, defaults).map(r => r.id)).toEqual(['1', '2']);
    expect(filterHomeRecords(records, patients, { ...defaults, status: 'Aprovado', type: 'Avaliacao' })).toHaveLength(0);
    expect(filterHomeRecords(records, patients, { ...defaults, status: 'Rascunho' })).toHaveLength(1);
  });
  it('agrupa por ID independentemente do tipo string ou número', () => {
    expect(groupHomeRecords([...records, { ...records[1], id: '3', patient_id: '1' }]).get('1')?.map(r => r.id)).toEqual(['1', '3']);
  });
  it('preserva datas sem horário e trata datas inválidas', () => {
    expect(homeRecordDay('2026-10-10')).toBe('2026-10-10');
    expect(homeRecordDay('não é uma data')).toBe('');
  });
  it('reconhece as variações de paciente ativo em português e inglês', () => {
    expect(isHomePatientActive(patients[0])).toBe(true);
    expect(isHomePatientActive({ ...patients[0], status: 'Em Atendimento' })).toBe(true);
    expect(isHomePatientActive(patients[1])).toBe(false);
  });
});
