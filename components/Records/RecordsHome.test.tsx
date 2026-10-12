import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RecordsHome } from './RecordsHome';

const patients = [{ id: '1', full_name: 'João da Silva', status: 'Ativo' }, { id: '2', full_name: 'Maria Souza', status: 'inactive' }, { id: '3', full_name: 'Paciente sem registro' }];
const records = [
  { id: '10', patient_id: '1', record_type: 'Avaliacao', title: 'Avaliação — 10/10/2026', status: 'Rascunho', created_at: '2026-10-10', updated_at: '2026-10-12T12:00:00', professional_name: 'Ana Psicóloga' },
  { id: '11', patient_id: '2', record_type: 'Evolucao', title: 'Evolução — 11/10/2026', status: 'Aprovado', created_at: '2026-10-11' },
];

afterEach(cleanup);
describe('Tela inicial do prontuário', () => {
  const setup = () => {
    const onOpenPatient = vi.fn();
    const onOpenRecord = vi.fn().mockResolvedValue(undefined);
    render(<RecordsHome patients={patients} records={records} loading={false} onOpenPatient={onOpenPatient} onOpenRecord={onOpenRecord} onRetry={vi.fn()} />);
    return { onOpenPatient, onOpenRecord };
  };
  it('mostra pacientes ativos, inativos e sem registros e abre o prontuário certo', () => {
    const { onOpenPatient } = setup();
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.getByText('Paciente sem registro')).toBeInTheDocument();
    const card = screen.getByText('João da Silva').closest('article')!;
    fireEvent.click(within(card).getByRole('button', { name: 'Abrir prontuário' }));
    expect(onOpenPatient).toHaveBeenCalledWith('1');
  });
  it('destaca o paciente na atividade recente e permite abrir o registro específico', () => {
    const { onOpenRecord } = setup();
    fireEvent.click(screen.getByRole('tab', { name: 'Últimos registros' }));
    fireEvent.change(screen.getByLabelText('Paciente, título ou profissional'), { target: { value: 'joao' } });
    expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument();
    const card = screen.getByText('João da Silva').closest('article')!;
    expect(within(card).getByText('Data de referência')).toBeInTheDocument();
    expect(within(card).getByText('10/10/2026')).toBeInTheDocument();
    expect(within(card).getByText('Atualizado em 12/10/2026')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Abrir registro' }));
    expect(onOpenRecord).toHaveBeenCalledWith(records[0]);
  });
  it('filtra pacientes pelos seus rascunhos e limpa a busca', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ver rascunhos' }));
    expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument();
    expect(screen.queryByText('Paciente sem registro')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
  });
  it('mostra erro recuperável em vez de informar que não há registros', () => {
    const onRetry = vi.fn();
    render(<RecordsHome patients={[]} records={[]} loading={false} error onOpenPatient={vi.fn()} onOpenRecord={vi.fn()} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
  it('aplica tipo e período às duas visões e usa a data de referência', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Tipo de registro'), { target: { value: 'Avaliacao' } });
    fireEvent.change(screen.getByLabelText('Data de referência: de'), { target: { value: '2026-10-10' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-10-10' } });
    expect(screen.getByText('João da Silva')).toBeInTheDocument();
    expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Últimos registros' }));
    expect(screen.getByText('João da Silva')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Data de referência: de'), { target: { value: '2026-10-12' } });
    expect(screen.getByRole('alert')).toHaveTextContent('A data inicial deve ser anterior à data final.');
    expect(screen.getByText('Nenhum resultado para esta busca')).toBeInTheDocument();
  });
  it('pagina os resultados e retorna à primeira página ao filtrar', () => {
    const manyPatients = Array.from({ length: 14 }, (_, index) => ({ id: String(index + 1), full_name: `Paciente ${String(index + 1).padStart(2, '0')}` }));
    render(<RecordsHome patients={manyPatients} records={[]} loading={false} onOpenPatient={vi.fn()} onOpenRecord={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.queryByText('Paciente 14')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(screen.getByText('Paciente 14')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Paciente, título ou profissional'), { target: { value: 'Paciente 01' } });
    expect(screen.getByText('Paciente 01')).toBeInTheDocument();
    expect(screen.queryByText('Paciente 14')).not.toBeInTheDocument();
  });
});
