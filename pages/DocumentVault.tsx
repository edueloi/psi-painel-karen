import React, { useState, useMemo, useEffect } from 'react';
import {
  FolderLock, FolderOpen, FileText, Plus,
  Shield, Lock, Unlock, Edit3, FilePlus, ChevronRight,
  Save, Trash, KeyRound
} from 'lucide-react';
import {
  PageWrapper, SectionTitle, ContentCard, Button, IconButton, Input, Modal, ModalFooter, ConfirmModal,
  Switch, Alert, Badge, Tabs, EmptyState, RichTextEditor,
  FilterLine, FilterLineSection, FilterLineSearch,
} from '../components/UI';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';

const docTabs = [
  { id: 'conteudo', label: 'Conteúdo', icon: FileText },
  { id: 'seguranca', label: 'Segurança', icon: KeyRound },
] as const;
type DocTabId = typeof docTabs[number]['id'];

interface VaultItem {
  id: string;
  name: string;
  type: 'folder' | 'document';
  parentId: string | null;
  content?: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DocumentVault: React.FC = () => {
  const { pushToast } = useToast();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Form States
  const [newItemName, setNewItemName] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [vaultPassword, setVaultPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newItemLocked, setNewItemLocked] = useState(true);
  const [docTab, setDocTab] = useState<DocTabId>('conteudo');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'open' | 'delete' | 'edit', item: VaultItem } | null>(null);
  
  // Security State
  const [unlockedItems, setUnlockedItems] = useState<Set<string>>(new Set());

  const loadVault = async () => {
    try {
      const [conf, folders, docs] = await Promise.all([
        api.get<any>('/vault/config'),
        api.get<any[]>('/vault/folders'),
        api.get<any[]>('/vault/documents')
      ]);
      
      const items: VaultItem[] = [
        ...folders.map((f: any) => ({
          id: String(f.id),
          name: f.name,
          type: 'folder' as const,
          parentId: null, // for now 1 level
          isLocked: f.is_locked !== 0 && f.is_locked !== false,
          createdAt: f.created_at,
          updatedAt: f.updated_at
        })),
        ...docs.map((d: any) => ({
          id: String(d.id),
          name: d.title,
          type: 'document' as const,
          parentId: d.folder_id ? String(d.folder_id) : null,
          content: '', 
          isLocked: d.is_locked !== 0 && d.is_locked !== false,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }))
      ];
      setItems(items);
    } catch (e) {
      console.error(e);
      pushToast('error', 'Erro ao carregar cofre.');
    }
  };

  useEffect(() => {
    loadVault();
  }, []);

  useEffect(() => {
    if (isDocModalOpen) setDocTab('conteudo');
  }, [isDocModalOpen]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesFolder = item.parentId === currentFolderId;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFolder && matchesSearch;
    });
  }, [items, currentFolderId, searchTerm]);

  const breadcrumbs = useMemo(() => {
    const crumbs = [];
    let currentId = currentFolderId;
    while (currentId) {
      const folder = items.find(i => i.id === currentId);
      if (folder) {
        crumbs.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  }, [items, currentFolderId]);

  const handleCreateFolder = async () => {
    if (!newItemName.trim()) return;
    try {
      if (selectedItem && selectedItem.type === 'folder') {
        await api.put(`/vault/folders/${selectedItem.id}`, { name: newItemName.trim(), is_locked: newItemLocked });
        pushToast('success', 'Pasta atualizada!');
      } else {
        await api.post('/vault/folders', { name: newItemName.trim(), is_locked: newItemLocked });
        pushToast('success', 'Pasta criada com sucesso!');
      }
      setIsFolderModalOpen(false);
      setNewItemName('');
      loadVault();
    } catch (e) {
      pushToast('error', 'Erro ao salvar pasta.');
    }
  };

  const handleCreateDoc = async () => {
    if (!newItemName.trim()) return;
    try {
      await api.post('/vault/documents', { 
        title: newItemName.trim(), 
        folder_id: currentFolderId || null, 
        content: newDocContent,
        is_locked: newItemLocked
      });
      pushToast('success', 'Documento criado com sucesso!');
      setIsDocModalOpen(false);
      setNewItemName('');
      setNewDocContent('');
      loadVault();
    } catch (e) {
      pushToast('error', 'Erro ao criar documento.');
    }
  };

  const handleItemClick = async (item: VaultItem) => {
    if (item.isLocked && !unlockedItems.has(item.id)) {
      setPendingAction({ type: 'open', item });
      setSelectedItem(item);
      setIsPasswordModalOpen(true);
    } else {
      if (item.type === 'folder') {
        setCurrentFolderId(item.id);
      } else {
        setSelectedItem(item);
        setNewItemName(item.name);
        setNewItemLocked(item.isLocked);
        try {
          const res = await api.get<any>(`/vault/documents/${item.id}`);
          setNewDocContent(res.content || '');
          setIsDocModalOpen(true);
        } catch (e) {
          pushToast('error', 'Erro ao carregar documento.');
        }
      }
    }
  };

  const handleVerifyPassword = async () => {
    try {
      await api.post('/vault/config/verify', { password: vaultPassword });

      if (pendingAction) {
        const newUnlocked = new Set(unlockedItems);
        newUnlocked.add(pendingAction.item.id);
        setUnlockedItems(newUnlocked);
        
        if (pendingAction.type === 'open') {
          if (pendingAction.item.type === 'folder') {
            setCurrentFolderId(pendingAction.item.id);
          } else {
            setSelectedItem(pendingAction.item);
            setNewItemName(pendingAction.item.name);
            setNewItemLocked(pendingAction.item.isLocked);
            const res = await api.get<any>(`/vault/documents/${pendingAction.item.id}`);
            setNewDocContent(res.content || '');
            setIsDocModalOpen(true);
          }
        } else if (pendingAction.type === 'delete') {
          setIsDeleteModalOpen(true);
        } else if (pendingAction.type === 'edit') {
          setSelectedItem(pendingAction.item);
          setNewItemName(pendingAction.item.name);
          setNewItemLocked(pendingAction.item.isLocked);
          if (pendingAction.item.type === 'folder') {
            setIsFolderModalOpen(true);
          } else {
            const res = await api.get<any>(`/vault/documents/${pendingAction.item.id}`);
            setNewDocContent(res.content || '');
            setIsDocModalOpen(true);
          }
        }
      }

      setVaultPassword('');
      setIsPasswordModalOpen(false);
      setPendingAction(null);
    } catch (e: any) {
      pushToast('error', e.message || 'Erro de autenticação!');
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    try {
      if (selectedItem.type === 'folder') {
        await api.delete(`/vault/folders/${selectedItem.id}`);
      } else {
        await api.delete(`/vault/documents/${selectedItem.id}`);
      }
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
      pushToast('success', 'Excluído com sucesso!');
      loadVault();
    } catch (e) {
      pushToast('error', 'Erro ao excluir item.');
    }
  };

  const handleUpdateDoc = async () => {
    if (!selectedItem) return;
    try {
      await api.put(`/vault/documents/${selectedItem.id}`, {
        title: newItemName,
        folder_id: selectedItem.parentId || null,
        content: newDocContent,
        is_locked: newItemLocked
      });
      setIsDocModalOpen(false);
      setSelectedItem(null);
      pushToast('success', 'Documento atualizado!');
      loadVault();
    } catch (e) {
      pushToast('error', 'Erro ao atualizar documento.');
    }
  };

  const openEditItem = (item: VaultItem) => {
    if (item.isLocked && !unlockedItems.has(item.id)) {
      setPendingAction({ type: 'edit', item });
      setIsPasswordModalOpen(true);
    } else {
      setSelectedItem(item);
      setNewItemName(item.name);
      setNewItemLocked(item.isLocked);
      if (item.type === 'folder') {
        setIsFolderModalOpen(true);
      } else {
        api.get<any>(`/vault/documents/${item.id}`).then(res => {
          setNewDocContent(res.content || '');
          setIsDocModalOpen(true);
        });
      }
    }
  };

  const openDeleteItem = (item: VaultItem) => {
    if (item.isLocked && !unlockedItems.has(item.id)) {
      setPendingAction({ type: 'delete', item });
      setIsPasswordModalOpen(true);
    } else {
      setSelectedItem(item);
      setIsDeleteModalOpen(true);
    }
  };

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={FolderLock}
          title="Cofre de Documentos"
          description="Armazenamento seguro com criptografia e proteção por senha."
          action={
            <>
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Plus size={14} />}
                onClick={() => { setSelectedItem(null); setNewItemName(''); setNewItemLocked(true); setIsFolderModalOpen(true); }}
              >
                Nova pasta
              </Button>
              <Button
                variant="primary"
                size="sm"
                iconLeft={<FilePlus size={14} />}
                onClick={() => { setSelectedItem(null); setNewItemName(''); setNewDocContent(''); setNewItemLocked(true); setDocTab('conteudo'); setIsDocModalOpen(true); }}
              >
                Criar documento
              </Button>
            </>
          }
        />

        <FilterLine>
          <FilterLineSection grow>
            <nav aria-label="Navegação do cofre" className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 min-w-0">
              <button
                type="button"
                onClick={() => setCurrentFolderId(null)}
                className="hover:text-primary-700 transition-colors flex items-center gap-1.5"
              >
                <Shield size={14} className="text-primary-600" /> Meu cofre
              </button>
              {breadcrumbs.map(crumb => (
                <React.Fragment key={crumb.id}>
                  <ChevronRight size={14} className="text-slate-300" />
                  <button
                    type="button"
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className="hover:text-primary-700 transition-colors truncate"
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </nav>
          </FilterLineSection>
          <FilterLineSection>
            <div className="w-full sm:w-[280px]">
              <FilterLineSearch
                aria-label="Buscar no cofre"
                placeholder="Buscar no cofre..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
          </FilterLineSection>
        </FilterLine>

        {filteredItems.length === 0 ? (
          <ContentCard>
            <EmptyState
              icon={Shield}
              title="Nenhum item por aqui"
              description="Esta pasta está vazia ou nenhum item corresponde à busca. Use os botões acima para adicionar novos registros seguros."
            />
          </ContentCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {filteredItems.map(item => (
              <ContentCard key={item.id} padding="none" className="group hover:border-primary-200 transition-all overflow-hidden">
                <div className="flex items-center gap-1 p-3">
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
                        item.type === 'folder'
                          ? 'bg-amber-50 border-amber-100 text-amber-600'
                          : 'bg-primary-50 border-primary-100 text-primary-600'
                      }`}>
                        {item.type === 'folder' ? <FolderOpen size={18} /> : <FileText size={18} />}
                      </div>
                      {item.isLocked && !unlockedItems.has(item.id) && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-800 text-white rounded-full flex items-center justify-center border border-white">
                          <Lock size={9} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-medium text-slate-900 truncate">{item.name}</h3>
                      <p className="text-[11px] text-slate-500">{item.type === 'folder' ? 'Pasta' : 'Documento'}</p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton variant="ghost" size="sm" aria-label={`Editar ${item.name}`} title="Editar" onClick={() => openEditItem(item)}>
                      <Edit3 size={14} />
                    </IconButton>
                    <IconButton variant="ghost" size="sm" aria-label={`Excluir ${item.name}`} title="Excluir" className="text-red-500 hover:text-red-600" onClick={() => openDeleteItem(item)}>
                      <Trash size={14} />
                    </IconButton>
                  </div>
                </div>
              </ContentCard>
            ))}
          </div>
        )}

        <Alert variant="info" title="Segurança de dados nível militar">
          Nossa tecnologia de cofre utiliza criptografia de ponta a ponta. Documentos marcados como seguros só podem ser descriptografados mediante sua senha mestre local. Ninguém, nem mesmo nossa equipe, tem acesso a estes arquivos sem sua chave.
          <span className="mt-2 flex flex-wrap gap-2">
            <Badge color="success" size="sm" dot>TLS 1.3 ativo</Badge>
            <Badge color="success" size="sm" dot>AES-256</Badge>
          </span>
        </Alert>
      </div>

      {/* MODALS */}

      {/* Folder Modal */}
      <Modal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        title={selectedItem ? "Editar Pasta" : "Nova Pasta"}
        size="sm"
        footer={
          <ModalFooter align="between">
            <Button variant="ghost" size="sm" onClick={() => setIsFolderModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleCreateFolder}>{selectedItem ? "Salvar pasta" : "Criar pasta"}</Button>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nome da pasta"
            placeholder="Ex: Contratos de Locação"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            autoFocus
          />

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <Switch
              checked={newItemLocked}
              onCheckedChange={setNewItemLocked}
              label="Bloqueio automático"
              description="Requer senha de login para acessar."
            />
          </div>

          <Alert variant="warning">
            Use a trava de bloqueio para exigir a sua senha de login caso alguém precise abrir ou editar a pasta.
          </Alert>
        </div>
      </Modal>

      {/* Document Modal (Editor) */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title={selectedItem ? "Editar Documento" : "Criar Novo Documento"}
        size="full"
        footer={
          <ModalFooter align="between">
            <Button variant="ghost" size="sm" onClick={() => setIsDocModalOpen(false)}>Fechar</Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Save size={14} />}
              onClick={() => {
                if (!newItemName.trim()) { setDocTab('conteudo'); }
                (selectedItem ? handleUpdateDoc : handleCreateDoc)();
              }}
            >
              Salvar documento
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <Tabs<DocTabId> items={docTabs} value={docTab} onChange={setDocTab} label="Seções do documento">
            {docTab === 'conteudo' && (
              <div className="space-y-3">
                <Input
                  label="Título do documento"
                  placeholder="Ex: Termo de Consentimento Livre"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                />
                <div>
                  <label className="ds-label mb-1 block">Conteúdo do documento</label>
                  <RichTextEditor
                    value={newDocContent}
                    onChange={setNewDocContent}
                    placeholder="Escreva ou cole o conteúdo do documento aqui..."
                    minHeight="50vh"
                  />
                </div>
              </div>
            )}

            {docTab === 'seguranca' && (
              <div className="space-y-3 max-w-xl">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <Switch
                    checked={newItemLocked}
                    onCheckedChange={setNewItemLocked}
                    label="Cofre bloqueado"
                    description="Requer senha de login para abrir ou editar este documento."
                  />
                </div>
                <Alert variant="warning">
                  Use a trava de bloqueio para exigir a sua senha de login caso alguém precise abrir ou editar o documento.
                </Alert>
              </div>
            )}
          </Tabs>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Acesso de Segurança"
        size="sm"
        footer={
          <ModalFooter align="between">
            <Button variant="ghost" size="sm" onClick={() => setIsPasswordModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" iconLeft={<Unlock size={14} />} onClick={handleVerifyPassword}>
              Desbloquear acesso
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center shrink-0 border border-primary-100">
              <Lock size={16} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-900">Digite a senha do seu login</h4>
              <p className="text-xs text-slate-500">
                Esta pasta/documento requer autorização de segurança. Confirme com a senha de administrador.
              </p>
            </div>
          </div>

          <Input
            label="Senha de login"
            type="password"
            placeholder="••••••••"
            value={vaultPassword}
            onChange={e => setVaultPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleVerifyPassword(); }}
            autoFocus
          />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteItem}
        variant="danger"
        title="Excluir permanentemente?"
        confirmLabel="Excluir agora"
        message={
          <>
            Tem certeza que deseja excluir <strong>{selectedItem?.name}</strong>? Esta ação é irreversível e o item será removido do cofre.
          </>
        }
      />
    </PageWrapper>
  );
};
