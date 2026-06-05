import { useCallback, useState } from 'react';
import { PageState } from '@/components/PageState';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  createUser,
  deleteUser,
  updateUser,
  fetchContratistas,
  fetchMunicipios,
  fetchUsers,
  type AdminUser,
  type CreateUserInput,
} from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import type { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, Trash2 } from 'lucide-react';

export default function AdminUsuariosPage() {
  const load = useCallback(async () => {
    const [users, municipios, contratistas] = await Promise.all([
      fetchUsers(),
      fetchMunicipios(),
      fetchContratistas(),
    ]);
    return { users, municipios, contratistas };
  }, []);

  const { data, loading, error, reload } = useAsyncData(load, [load]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('municipal');
  const [municipioId, setMunicipioId] = useState('');
  const [contratistaId, setContratistaId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !fullName.trim()) {
      toast.error('Complete email, contraseña y nombre.');
      return;
    }
    if (role === 'municipal' && !municipioId) {
      toast.error('Seleccione municipio para usuario municipal.');
      return;
    }
    if (role === 'contratista' && !contratistaId) {
      toast.error('Seleccione contratista.');
      return;
    }

    const body: CreateUserInput = {
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      role,
      avatar_initials: fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      municipio_id: role === 'municipal' ? municipioId : undefined,
      contratista_id: role === 'contratista' ? contratistaId : undefined,
    };

    setSubmitting(true);
    try {
      await createUser(body);
      toast.success('Usuario creado');
      setDialogOpen(false);
      setEmail('');
      setPassword('');
      setFullName('');
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al crear usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u: AdminUser) => {
    setBusyId(u.id);
    try {
      await updateUser(u.id, { isActive: !u.isActive });
      toast.success(u.isActive ? 'Usuario desactivado' : 'Usuario activado');
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo actualizar el usuario');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!window.confirm(`¿Eliminar usuario ${u.email}?`)) return;
    setBusyId(u.id);
    try {
      await deleteUser(u.id);
      toast.success('Usuario eliminado');
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar');
    } finally {
      setBusyId(null);
    }
  };

  if (!data) {
    return (
      <PageState loading={loading} error={error} onRetry={reload}>
        <span />
      </PageState>
    );
  }

  const roleLabel = (r: UserRole) =>
    ({ estatal: 'Estatal', municipal: 'Municipal', contratista: 'Contratista' })[r] ?? r;

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-brand-primary">Administración de usuarios</h1>
            <p className="text-xs text-gray-500">Solo personal estatal puede crear cuentas.</p>
          </div>
          <Button type="button" onClick={() => setDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Nuevo usuario
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Usuarios ({data.users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-gray-500">Nombre</th>
                    <th className="text-left py-2 px-2 text-gray-500">Email</th>
                    <th className="text-left py-2 px-2 text-gray-500">Rol</th>
                    <th className="text-left py-2 px-2 text-gray-500">Alcance</th>
                    <th className="text-center py-2 px-2 text-gray-500">Estado</th>
                    <th className="text-center py-2 px-2 text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => {
                    const mun = data.municipios.find((m) => m.id === u.municipioId);
                    const con = data.contratistas.find((c) => c.id === u.contratistaId);
                    const scope =
                      u.role === 'municipal'
                        ? mun?.nombre ?? u.municipioId
                        : u.role === 'contratista'
                          ? con?.nombre ?? u.contratistaId
                          : 'Estatal';
                    return (
                      <tr key={u.id} className="border-b border-gray-100">
                        <td className="py-2 px-2 font-medium">{u.fullName}</td>
                        <td className="py-2 px-2 text-gray-600">{u.email}</td>
                        <td className="py-2 px-2">{roleLabel(u.role)}</td>
                        <td className="py-2 px-2 text-gray-500">{scope ?? '—'}</td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={
                              u.isActive
                                ? 'text-green-700 font-medium'
                                : 'text-gray-400 font-medium'
                            }
                          >
                            {u.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center space-x-2">
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => handleToggleActive(u)}
                            className="text-brand-primary-light hover:underline disabled:opacity-50"
                          >
                            {u.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => handleDelete(u)}
                            className="text-red-600 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Nombre completo</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Rol</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1 bg-white"
                >
                  <option value="estatal">Estatal</option>
                  <option value="municipal">Municipal</option>
                  <option value="contratista">Contratista</option>
                </select>
              </div>
              {role === 'municipal' && (
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Municipio</label>
                  <select
                    value={municipioId}
                    onChange={(e) => setMunicipioId(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1 bg-white"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {data.municipios.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {role === 'contratista' && (
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Contratista</label>
                  <select
                    value={contratistaId}
                    onChange={(e) => setContratistaId(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1 bg-white"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {data.contratistas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creando...' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageState>
  );
}
