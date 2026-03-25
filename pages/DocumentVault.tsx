import React, { useState, useMemo, useEffect } from 'react';
import { 
  FolderLock, FolderOpen, FileText, Plus, Search, 
  MoreVertical, Shield, Lock, Unlock, Trash2, 
  Edit3, Eye, FilePlus, ChevronRight, Clock,
  Key, ShieldCheck, AlertCircle, Save, X, Trash
} from 'lucide-react';
import { PageHeader } from '../components/UI/PageHeader';
import { Button } from '../components/UI/Button';
import { Modal } from '../components/UI/Modal';
import { Input } from '../components/UI/Input';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { RichTextEditor } from '../components/UI/RichTextEditor';

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

  return (
    <div className="mx-auto max-w-[1600px] px-6 pt-6 pb-20 space-y-6 animate-fadeIn">
      <PageHeader
        icon={<FolderLock />}
        title="Cofre de Documentos"
        subtitle="Armazenamento seguro com criptografia e proteção por senha."
        containerClassName="mb-0"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              radius="xl"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={() => { setSelectedItem(null); setNewItemName(''); setNewItemLocked(true); setIsFolderModalOpen(true); }}
            >
              NOVA PASTA
            </Button>
            <Button
              variant="primary"
              radius="xl"
              size="sm"
              leftIcon={<FilePlus size={16} />}
              onClick={() => { setSelectedItem(null); setNewItemName(''); setNewDocContent(''); setNewItemLocked(true); setIsDocModalOpen(true); }}
            >
              CRIAR DOCUMENTO
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* Navigation Bar */}
        <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black text-slate-400">
            <button 
              onClick={() => setCurrentFolderId(null)}
              className="hover:text-indigo-600 transition-colors uppercase tracking-widest flex items-center gap-2"
            >
              <Shield size={14} className="text-indigo-500" /> MEU COFRE
            </button>
            {breadcrumbs.map(crumb => (
              <React.Fragment key={crumb.id}>
                <ChevronRight size={14} className="text-slate-300" />
                <button 
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className="hover:text-indigo-600 transition-colors uppercase tracking-widest"
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar no cofre..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 transition-all w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredItems.map(item => (
            <div 
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="group relative cursor-pointer flex flex-col items-center justify-center p-8 bg-white border border-slate-100 rounded-[2rem] hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 active:scale-95"
            >
              <div className="relative mb-4">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${
                  item.type === 'folder' 
                    ? 'bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white' 
                    : 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white'
                }`}>
                  {item.type === 'folder' ? <FolderOpen size={36} /> : <FileText size={36} />}
                </div>
                {item.isLocked && !unlockedItems.has(item.id) && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center border-4 border-white">
                    <Lock size={14} />
                  </div>
                )}
              </div>
              <h3 className="text-sm font-black text-slate-800 text-center uppercase tracking-tighter truncate w-full px-2">
                {item.name}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                {item.type === 'folder' ? 'Pasta' : 'Documento'}
              </p>

              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-2">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
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
                  }}
                  className="p-2 bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                  title="Editar"
                >
                  <Edit3 size={14} />
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (item.isLocked && !unlockedItems.has(item.id)) {
                      setPendingAction({ type: 'delete', item });
                      setIsPasswordModalOpen(true);
                    } else {
                      setSelectedItem(item); 
                      setIsDeleteModalOpen(true);
                    }
                  }}
                  className="p-2 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                  title="Excluir"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center mb-6">
                <Shield size={48} className="text-slate-300" />
              </div>
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Acesso Negado</h4>
              <p className="text-xs font-bold text-slate-300 max-w-xs mt-2">
                Esta pasta está vazia ou bloqueada. Use os botões acima para adicionar novos registros seguros.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Security Info Card */}
      <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <ShieldCheck size={200} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
            <Key size={32} />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-black tracking-tight uppercase">Segurança de Dados Nível Militar</h3>
            <p className="text-indigo-100 text-sm font-medium leading-relaxed max-w-2xl">
              Nossa tecnologia de cofre utiliza criptografia de ponta a ponta. Documentos marcados como seguros só podem ser descriptografados mediante sua senha mestre local. Ninguém, nem mesmo nossa equipe, tem acesso a estes arquivos sem sua chave.
            </p>
          </div>
          <div className="flex gap-4">
             <div className="px-4 py-2 bg-white/10 rounded-xl flex items-center gap-2 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">TLS 1.3 Ativo</span>
             </div>
             <div className="px-4 py-2 bg-white/10 rounded-xl flex items-center gap-2 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">AES-256</span>
             </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      
      {/* Folder Modal */}
      <Modal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        title={selectedItem ? "Editar Pasta" : "Nova Pasta"}
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setIsFolderModalOpen(false)}>CANCELAR</Button>
            <Button variant="primary" onClick={handleCreateFolder}>{selectedItem ? "SALVAR CONTEÚDO" : "CRIAR PASTA"}</Button>
          </div>
        }
      >
        <div className="space-y-6">
          <Input 
            label="Nome da Pasta"
            placeholder="Ex: Contratos de Locação"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            autoFocus
          />
          
          <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer" onClick={() => setNewItemLocked(!newItemLocked)}>
             <div className={`w-10 h-6 flex items-center bg-slate-200 rounded-full p-1 cursor-pointer transition-colors ${newItemLocked ? 'bg-indigo-500' : ''}`}>
               <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${newItemLocked ? 'translate-x-4' : ''}`}></div>
             </div>
             <div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Bloqueio Automático</p>
                <p className="text-[10px] text-slate-400 font-medium">Requer senha de login para acessar.</p>
             </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
             <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
             <p className="text-[10px] font-bold text-amber-700 leading-normal">
               Use a trava de bloqueio para exigir a sua senha de login caso alguém precise abrir ou editar a pasta.
             </p>
          </div>
        </div>
      </Modal>

      {/* Document Modal (Editor) */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title={selectedItem ? "Editar Documento" : "Criar Novo Documento"}
        maxWidth="max-w-4xl"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setIsDocModalOpen(false)}>FECHAR</Button>
            <Button 
              variant="primary" 
              leftIcon={<Save size={18} />}
              onClick={selectedItem ? handleUpdateDoc : handleCreateDoc}
            >
              SALVAR DOCUMENTO
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4">
             <Input 
               label="Título do Documento"
               placeholder="Ex: Termo de Consentimento Livre"
               value={newItemName}
               onChange={e => setNewItemName(e.target.value)}
               containerClassName="flex-1"
             />

             <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer self-end mb-1 shrink-0" onClick={() => setNewItemLocked(!newItemLocked)}>
                <div className={`w-8 h-5 flex items-center bg-slate-200 rounded-full p-1 cursor-pointer transition-colors ${newItemLocked ? 'bg-indigo-500' : ''}`}>
                  <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${newItemLocked ? 'translate-x-3' : ''}`}></div>
                </div>
                <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Cofre Bloqueado</p>
             </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Conteúdo do Documento</label>
            <RichTextEditor
               value={newDocContent}
               onChange={setNewDocContent}
               placeholder="Escreva ou cole o conteúdo do documento aqui..."
               minHeight="50vh"
            />
          </div>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Acesso de Segurança"
        maxWidth="sm"
      >
        <div className="space-y-6 text-center py-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-indigo-100 shadow-inner">
             <Lock size={32} />
          </div>
          
          <div className="space-y-1">
            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              Digite a Senha do Seu Login
            </h4>
            <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto">
              Esta pasta/documento requer autorização de segurança. Confirme com a senha de administrador.
            </p>
          </div>

          <div className="space-y-4">
            <Input 
              label="Senha de Login"
              type="password"
              placeholder="••••••••"
              value={vaultPassword}
              onChange={e => setVaultPassword(e.target.value)}
              autoFocus
            />
            
            <Button 
               variant="primary" 
               fullWidth 
               radius="xl" 
               size="lg"
               onClick={handleVerifyPassword}
               className="font-black"
            >
              DESBLOQUEAR ACESSO
            </Button>
            
            <button 
              onClick={() => setIsPasswordModalOpen(false)}
              className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              Cancelar e Voltar
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Permanentemente?"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>CANCELAR</Button>
            <Button variant="danger" onClick={handleDeleteItem}>EXCLUIR AGORA</Button>
          </div>
        }
      >
        <div className="flex items-center gap-4 text-rose-600">
           <Trash2 size={40} className="shrink-0" />
           <p className="text-sm font-medium leading-relaxed">
             Tem certeza que deseja excluir <strong>{selectedItem?.name}</strong>? Esta ação é irreversível e o documento será removido do cofre.
           </p>
        </div>
      </Modal>
    </div>
  );
};
