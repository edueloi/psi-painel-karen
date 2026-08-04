import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, Stethoscope } from 'lucide-react';
import { Button, IconButton } from '../UI/Button';
import { Modal } from '../UI/Modal';
import { Input, Textarea } from '../UI/Input';
import { Combobox } from '../UI/Combobox';
import { Switch } from '../UI/Switch';
import {
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch,
} from '../UI/FilterLine';
import { GridTable } from '../UI/GridTable';
import { StatCard } from '../UI/StatCard';
import { StatusAlert } from '../UI/StatusAlert';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';

interface ProfessionalArea {
  id: number;
  name: string;
  slug: string;
  category: string;
  registry_label: string | null;
  registry_mask: string | null;
  description: string | null;
  icon: string | null;
  active: boolean;
  sort_order: number;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const ProfessionalAreasTab: React.FC = () => {
  const { pushToast } = useToast();
  const [areas, setAreas] = useState<ProfessionalArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ProfessionalArea> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadAreas = () => {
    setIsLoading(true);
    api.get<ProfessionalArea[]>('/professional-areas/all')
      .then(data => setAreas(data || []))
      .catch(() => pushToast('error', 'Erro ao carregar áreas de atuação.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadAreas(); }, []);

  const categories = useMemo(
    () => Array.from(new Set(areas.map(a => a.category))).sort(),
    [areas]
  );

  const filtered = useMemo(() => areas.filter(a =>
    (categoryFilter === 'all' || a.category === categoryFilter) &&
    norm(a.name).includes(norm(searchTerm))
  ), [areas, searchTerm, categoryFilter]);

  const openNew = () => {
    setEditing({ name: '', slug: '', category: categories[0] || '', registry_label: '', registry_mask: '', description: '', active: true });
    setIsModalOpen(true);
  };

  const openEdit = (a: ProfessionalArea) => {
    setEditing({ ...a });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.name?.trim()) { pushToast('warning', 'Nome é obrigatório.'); return; }
    if (!editing?.category?.trim()) { pushToast('warning', 'Categoria é obrigatória.'); return; }
    const slug = editing.slug?.trim() || slugify(editing.name);

    setIsProcessing(true);
    try {
      const payload = { ...editing, slug };
      if (editing.id) {
        const updated = await api.put<ProfessionalArea>(`/professional-areas/${editing.id}`, payload);
        setAreas(prev => prev.map(a => a.id === updated.id ? updated : a));
      } else {
        const saved = await api.post<ProfessionalArea>('/professional-areas', payload);
        setAreas(prev => [...prev, saved]);
      }
      setIsModalOpen(false);
      pushToast('success', 'Salvo com sucesso!');
    } catch (err: any) {
      pushToast('error', err?.message || 'Erro ao salvar área de atuação.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsProcessing(true);
    try {
      await api.delete(`/professional-areas/${deleteId}`);
      loadAreas();
      setDeleteId(null);
      pushToast('success', 'Área removida/desativada com sucesso!');
    } catch {
      pushToast('error', 'Erro ao excluir área de atuação.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Total de áreas" value={areas.length} icon={Stethoscope} color="default" delay={0} />
        <StatCard title="Ativas" value={areas.filter(a => a.active).length} icon={Stethoscope} color="success" delay={1} />
        <StatCard title="Categorias" value={categories.length} icon={Stethoscope} color="purple" delay={2} />
      </div>

      <FilterLine>
        <FilterLineSection grow>
          <FilterLineItem grow minWidth={240}>
            <FilterLineSearch value={searchTerm} onChange={setSearchTerm} placeholder="Buscar área..." />
          </FilterLineItem>
          <FilterLineItem minWidth={220}>
            <Combobox
              options={[{ value: 'all', label: 'Todas as categorias' }, ...categories.map(c => ({ value: c, label: c }))]}
              value={categoryFilter}
              onChange={v => setCategoryFilter(v as string)}
              placeholder="Categoria"
            />
          </FilterLineItem>
        </FilterLineSection>
        <FilterLineSection align="right">
          <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={openNew}>
            Nova Área
          </Button>
        </FilterLineSection>
      </FilterLine>

      <GridTable<ProfessionalArea>
        data={filtered}
        isLoading={isLoading}
        keyExtractor={r => r.id}
        onRowClick={openEdit}
        emptyMessage="Nenhuma área de atuação encontrada."
        renderMobileItem={(r) => (
          <div className="flex items-center justify-between w-full min-w-0">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate text-sm">{r.name}</p>
              <p className="text-xs text-slate-400 truncate">{r.category}</p>
            </div>
            <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              <IconButton variant="outline" size="xs" onClick={() => openEdit(r)}><Edit3 size={13} /></IconButton>
              <IconButton variant="danger" size="xs" onClick={() => setDeleteId(r.id)}><Trash2 size={13} /></IconButton>
            </div>
          </div>
        )}
        columns={[
          { header: 'Nome', render: r => <span className="font-semibold">{r.name}</span> },
          { header: 'Categoria', render: r => <span className="text-slate-500 text-sm">{r.category}</span> },
          { header: 'Registro', render: r => <span className="text-slate-500 text-sm">{r.registry_label || '—'}</span> },
          {
            header: 'Status',
            render: r => (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {r.active ? 'Ativa' : 'Inativa'}
              </span>
            ),
          },
          {
            header: 'Ações', className: 'text-right', headerClassName: 'text-right',
            render: r => (
              <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                <Button variant="outline" size="xs" onClick={() => openEdit(r)}><Edit3 size={14} /></Button>
                <Button variant="danger" size="xs" onClick={() => setDeleteId(r.id)}><Trash2 size={14} /></Button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing?.id ? 'Editar Área de Atuação' : 'Nova Área de Atuação'}
        size="md"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} loading={isProcessing}>Salvar</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={editing?.name || ''}
            onChange={e => setEditing(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Psiquiatra"
          />
          <Input
            label="Slug"
            value={editing?.slug || ''}
            onChange={e => setEditing(prev => ({ ...prev, slug: e.target.value }))}
            placeholder="Gerado automaticamente a partir do nome"
            hint="Identificador único usado internamente."
          />
          <Combobox
            label="Categoria"
            options={categories.map(c => ({ value: c, label: c }))}
            value={editing?.category || ''}
            onChange={v => setEditing(prev => ({ ...prev, category: v as string }))}
            allowCustom
            onCustomAdd={v => setEditing(prev => ({ ...prev, category: v }))}
            placeholder="Selecione ou digite uma categoria"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sigla do registro"
              value={editing?.registry_label || ''}
              onChange={e => setEditing(prev => ({ ...prev, registry_label: e.target.value }))}
              placeholder="Ex: CRM"
            />
            <Input
              label="Máscara do registro"
              value={editing?.registry_mask || ''}
              onChange={e => setEditing(prev => ({ ...prev, registry_mask: e.target.value }))}
              placeholder="Ex: 00000/UF"
            />
          </div>
          <Textarea
            label="Descrição"
            value={editing?.description || ''}
            onChange={e => setEditing(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Breve descrição da área de atuação"
          />
          <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
            <span className="text-sm font-semibold text-slate-700">Área ativa</span>
            <Switch
              checked={editing?.active ?? true}
              onCheckedChange={v => setEditing(prev => ({ ...prev, active: v }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Excluir área de atuação"
        size="sm"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={isProcessing} disabled={isProcessing}>
              Confirmar exclusão
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <StatusAlert
            variant="warning"
            title="Confirmação"
            message="Se houver profissionais vinculados, a área será apenas desativada em vez de excluída."
          />
        </div>
      </Modal>
    </div>
  );
};
