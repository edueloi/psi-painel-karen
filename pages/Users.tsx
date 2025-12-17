
import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { User as UserType } from '../types'; // Renomeado para evitar conflito com JSX
import { 
  Plus, Search, Edit3, Trash2, MoreHorizontal, Loader2, 
  AlertTriangle, Shield, UserCheck, UserPlus, Lock
} from 'lucide-react';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<UserType[]>('/users');
      setUsers(response.data);
    } catch (err) {
      setError('Falha ao carregar usuários. Você precisa ser um admin para ver esta página.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const originalUsers = [...users];
    const updatedUsers = users.map(u => u.id === userId ? { ...u, role: newRole as any } : u);
    setUsers(updatedUsers);

    try {
      const userToUpdate = updatedUsers.find(u => u.id === userId);
      if (!userToUpdate) return;
      await api.put(`/users/${userId}`, { 
          name: userToUpdate.name, 
          role: newRole,
          is_active: userToUpdate.is_active // is_active is required by the backend
        });
    } catch (err) {
      setError('Falha ao atualizar o cargo do usuário.');
      setUsers(originalUsers); // Reverte a mudança em caso de erro
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Tem certeza que deseja remover este usuário?')) {
        try {
            await api.delete(`/users/${userId}`);
            fetchUsers(); // Recarrega a lista
        } catch (error) {
            setError('Falha ao remover o usuário.');
        }
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
  }), [users]);

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] font-sans">
      {/* Hero */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900 mb-2 leading-tight">Gestão de Usuários</h1>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
                Gerencie os acessos e permissões da sua equipe na plataforma.
            </p>
        </div>
        <div className="group relative">
            <button 
                disabled
                className="w-full lg:w-auto bg-indigo-600 text-white px-6 h-10 rounded-lg font-bold shadow-md flex items-center justify-center gap-2 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
                <UserPlus size={16} />
                Novo Usuário
            </button>
            <div className="absolute z-10 bottom-full mb-2 w-72 p-2 text-xs text-white bg-slate-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity">
                A criação de novos usuários diretamente por esta tela não está habilitada no backend. Apenas o usuário admin inicial é criado junto com o tenant.
            </div>
        </div>
      </div>
      
      {/* Stats */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase">Total de Usuários</h3>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase">Administradores</h3>
              <p className="text-2xl font-bold text-slate-800">{stats.admins}</p>
          </div>
       </div>

      {/* Toolbar */}
      <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input 
              type="text" 
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-white border border-slate-200 rounded-lg text-sm"
          />
      </div>

       {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center">
                <AlertTriangle className="mr-3" />
                <span>{error}</span>
            </div>
        )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left text-slate-500">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3">Usuário</th>
              <th scope="col" className="px-6 py-3">Cargo</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="bg-white border-b hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold">{user.name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={user.role} 
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="rounded-md border-slate-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-xs"
                  >
                    <option value="admin">Admin</option>
                    <option value="user">Usuário</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                    {user.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(user.id)} className="font-medium text-red-600 hover:underline p-2">
                    <Trash2 size={16}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && !loading && (
            <div className="text-center p-8 text-slate-500">
                Nenhum usuário encontrado.
            </div>
        )}
      </div>
    </div>
  );
};
