import { useCallback, useMemo, useState } from 'react';
import { PageState } from '@/components/PageState';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  createAlertaConfig,
  deleteAlertaConfig,
  fetchAlertaConfigs,
  fetchMunicipios,
  fetchObras,
  fetchUsers,
  simularAlertaConfig,
  toggleAlertaConfig,
  updateAlertaConfig,
  type SimularAlertaConfigResult,
} from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import {
  getAlertaTipoColor,
  getAlertaTipoLabel,
  getSeverityColor,
  getSeverityLabel,
} from '@/lib/utils';
import { toast } from 'sonner';
import type { AlertaConfig, AlertaConfigTipo, Severidad } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Bell,
  Clock,
  DollarSign,
  FileWarning,
  Pencil,
  Plus,
  Send,
  Trash2,
  TrendingDown,
  Users,
} from 'lucide-react';

const TIPOS: { value: AlertaConfigTipo; label: string; icon: typeof Bell }[] = [
  { value: 'sin_actualizaciones', label: 'Sin actualizaciones', icon: Clock },
  { value: 'exceso_presupuesto', label: 'Exceso de presupuesto', icon: DollarSign },
  { value: 'retraso_fisico', label: 'Retraso fisico', icon: TrendingDown },
  { value: 'sin_estimaciones', label: 'Sin estimaciones', icon: FileWarning },
  { value: 'documentacion_incompleta', label: 'Documentacion incompleta', icon: FileWarning },
];

type AlcanceTipo = 'todos' | 'programa' | 'municipio' | 'obra';

const emptyForm = () => ({
  nombre: '',
  descripcion: '',
  tipo: 'sin_actualizaciones' as AlertaConfigTipo,
  severidad: 'media' as Severidad,
  alcance: 'todos' as AlcanceTipo,
  programaFiltro: '',
  municipioId: '',
  obraId: '',
  umbralDias: 30,
  umbralPorcentaje: 10,
  umbralMonto: 0,
  destinatarioIds: [] as string[],
});

function scopeLabel(config: AlertaConfig): string {
  if (config.obraFolio) return `Obra: ${config.obraFolio}`;
  if (config.municipioNombre) return `Municipio: ${config.municipioNombre}`;
  if (config.programaFiltro) return `Programa: ${config.programaFiltro}`;
  return 'Todas las obras';
}

export default function ConfiguradorAlertasPage() {
  const { user } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AlertaConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlertaConfig | null>(null);
  const [simResult, setSimResult] = useState<SimularAlertaConfigResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const [configs, users, municipios, obras] = await Promise.all([
      fetchAlertaConfigs(),
      fetchUsers(),
      fetchMunicipios(),
      fetchObras(),
    ]);
    return { configs, users, municipios, obras };
  }, []);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const usersWithPhone = useMemo(
    () => data?.users.filter((u) => u.telefono?.trim()) ?? [],
    [data?.users],
  );

  const programas = useMemo(() => {
    if (!data?.obras) return [];
    return [...new Set(data.obras.map((o) => o.programa))].sort();
  }, [data?.obras]);

  const obrasFiltradas = useMemo(() => {
    if (!data?.obras) return [];
    let list = data.obras;
    if (user?.role === 'municipal' && user.municipioId) {
      list = list.filter((o) => o.municipioId === user.municipioId);
    }
    if (form.alcance === 'municipio' && form.municipioId) {
      list = list.filter((o) => o.municipioId === form.municipioId);
    }
    if (form.alcance === 'programa' && form.programaFiltro) {
      list = list.filter((o) => o.programa === form.programaFiltro);
    }
    return list;
  }, [data?.obras, form.alcance, form.municipioId, form.programaFiltro, user]);

  const openCreate = () => {
    setEditing(null);
    const base = emptyForm();
    if (user?.role === 'municipal' && user.municipioId) {
      base.alcance = 'municipio';
      base.municipioId = user.municipioId;
    }
    setForm(base);
    setDialogOpen(true);
  };

  const openEdit = (config: AlertaConfig) => {
    setEditing(config);
    let alcance: AlcanceTipo = 'todos';
    if (config.obraId) alcance = 'obra';
    else if (config.municipioId) alcance = 'municipio';
    else if (config.programaFiltro) alcance = 'programa';

    setForm({
      nombre: config.nombre,
      descripcion: config.descripcion ?? '',
      tipo: config.tipo,
      severidad: config.severidad,
      alcance,
      programaFiltro: config.programaFiltro ?? '',
      municipioId: config.municipioId ?? '',
      obraId: config.obraId ?? '',
      umbralDias: config.umbralDias ?? 30,
      umbralPorcentaje: config.umbralPorcentaje ?? 10,
      umbralMonto: config.umbralMonto ?? 0,
      destinatarioIds: config.destinatarios.map((d) => d.userId),
    });
    setDialogOpen(true);
  };

  const buildPayload = () => {
    const destinatarios = form.destinatarioIds
      .map((id) => {
        const u = data?.users.find((x) => x.id === id);
        if (!u?.telefono) return null;
        return { user_id: u.id, nombre: u.fullName, telefono: u.telefono };
      })
      .filter(Boolean) as { user_id: string; nombre: string; telefono: string }[];

    const payload: Parameters<typeof createAlertaConfig>[0] = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      tipo: form.tipo,
      severidad: form.severidad,
      destinatarios,
    };

    if (form.alcance === 'programa' && form.programaFiltro) {
      payload.programa_filtro = form.programaFiltro;
    } else if (form.alcance === 'municipio' && form.municipioId) {
      payload.municipio_id = form.municipioId;
    } else if (form.alcance === 'obra' && form.obraId) {
      payload.obra_id = form.obraId;
    }

    if (form.tipo === 'sin_actualizaciones' || form.tipo === 'sin_estimaciones') {
      payload.umbral_dias = form.umbralDias;
    }
    if (form.tipo === 'retraso_fisico') {
      payload.umbral_porcentaje = form.umbralPorcentaje;
    }
    if (form.tipo === 'exceso_presupuesto') {
      payload.umbral_porcentaje = form.umbralPorcentaje;
      if (form.umbralMonto > 0) payload.umbral_monto = form.umbralMonto;
    }

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error('Indique un nombre para la regla.');
      return;
    }
    if (form.alcance === 'obra' && !form.obraId) {
      toast.error('Seleccione una obra.');
      return;
    }
    if (form.alcance === 'municipio' && !form.municipioId) {
      toast.error('Seleccione un municipio.');
      return;
    }
    if (form.alcance === 'programa' && !form.programaFiltro) {
      toast.error('Seleccione un programa.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (editing) {
        await updateAlertaConfig(editing.id, payload);
        toast.success('Regla actualizada');
      } else {
        await createAlertaConfig(payload);
        toast.success('Regla creada');
      }
      setDialogOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (config: AlertaConfig) => {
    setBusyId(config.id);
    try {
      await toggleAlertaConfig(config.id);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteAlertaConfig(deleteTarget.id);
      toast.success('Regla eliminada');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar');
    } finally {
      setBusyId(null);
    }
  };

  const handleSimular = async (config: AlertaConfig) => {
    setBusyId(config.id);
    try {
      const result = await simularAlertaConfig(config.id);
      setSimResult(result);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error en simulacion');
    } finally {
      setBusyId(null);
    }
  };

  const toggleDestinatario = (userId: string) => {
    setForm((prev) => ({
      ...prev,
      destinatarioIds: prev.destinatarioIds.includes(userId)
        ? prev.destinatarioIds.filter((id) => id !== userId)
        : [...prev.destinatarioIds, userId],
    }));
  };

  if (!data) {
    return (
      <PageState loading={loading} error={error} onRetry={reload}>
        <span />
      </PageState>
    );
  }

  const activas = data.configs.filter((c) => c.activa).length;
  const tiposUnicos = new Set(data.configs.map((c) => c.tipo)).size;

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-brand-primary flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Configurador de Alertas
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Defina reglas personalizadas y destinatarios WhatsApp (envio simulado).
            </p>
          </div>
          <Button type="button" onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva regla
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase">Total reglas</div>
            <div className="text-2xl font-bold text-brand-primary">{data.configs.length}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-[10px] text-green-600 uppercase">Activas</div>
            <div className="text-2xl font-bold text-green-700">{activas}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-[10px] text-blue-600 uppercase">Tipos distintos</div>
            <div className="text-2xl font-bold text-blue-700">{tiposUnicos}</div>
          </div>
        </div>

        <div className="space-y-3">
          {data.configs.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-gray-500">
                No hay reglas configuradas. Cree la primera con &quot;Nueva regla&quot;.
              </CardContent>
            </Card>
          )}

          {data.configs.map((config) => {
            const TipoIcon = TIPOS.find((t) => t.value === config.tipo)?.icon ?? Bell;
            return (
              <Card key={config.id} className={!config.activa ? 'opacity-70' : undefined}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TipoIcon className="w-4 h-4 text-brand-primary shrink-0" />
                        <CardTitle className="text-sm font-semibold">{config.nombre}</CardTitle>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: getAlertaTipoColor(config.tipo),
                            color: getAlertaTipoColor(config.tipo),
                          }}
                        >
                          {getAlertaTipoLabel(config.tipo)}
                        </Badge>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: getSeverityColor(config.severidad),
                            color: getSeverityColor(config.severidad),
                          }}
                        >
                          {getSeverityLabel(config.severidad)}
                        </Badge>
                        <Badge variant="secondary">{scopeLabel(config)}</Badge>
                      </div>
                      {config.descripcion && (
                        <p className="text-xs text-gray-500 mt-1">{config.descripcion}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-gray-500">Activa</span>
                      <Switch
                        checked={config.activa}
                        disabled={busyId === config.id}
                        onCheckedChange={() => handleToggle(config)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div className="flex -space-x-1">
                        {config.destinatarios.length === 0 ? (
                          <span className="text-xs text-gray-400">Sin destinatarios</span>
                        ) : (
                          config.destinatarios.slice(0, 5).map((d) => (
                            <span
                              key={d.userId}
                              title={`${d.nombre} (${d.telefono})`}
                              className="inline-flex w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-bold items-center justify-center border-2 border-white"
                            >
                              {d.nombre
                                .split(' ')
                                .map((w) => w[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          ))
                        )}
                        {config.destinatarios.length > 5 && (
                          <span className="text-xs text-gray-500 ml-2">
                            +{config.destinatarios.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busyId === config.id}
                        onClick={() => handleSimular(config)}
                        className="gap-1"
                      >
                        <Send className="w-3 h-3" />
                        Simular
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(config)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteTarget(config)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar regla' : 'Nueva regla de alerta'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Descripcion</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md mt-1 min-h-[60px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, tipo: e.target.value as AlertaConfigTipo }))
                    }
                    className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1 bg-white"
                  >
                    {TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Severidad</label>
                  <select
                    value={form.severidad}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, severidad: e.target.value as Severidad }))
                    }
                    className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1 bg-white"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Critica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase">Alcance</label>
                <select
                  value={form.alcance}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, alcance: e.target.value as AlcanceTipo }))
                  }
                  className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1 bg-white"
                  disabled={user?.role === 'municipal' && form.alcance === 'municipio'}
                >
                  {user?.role === 'estatal' && <option value="todos">Todas las obras</option>}
                  <option value="programa">Por programa</option>
                  {user?.role === 'estatal' && <option value="municipio">Por municipio</option>}
                  {user?.role === 'municipal' && (
                    <option value="municipio">Mi municipio</option>
                  )}
                  <option value="obra">Obra especifica</option>
                </select>
              </div>

              {form.alcance === 'programa' && (
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Programa</label>
                  <select
                    value={form.programaFiltro}
                    onChange={(e) => setForm((p) => ({ ...p, programaFiltro: e.target.value }))}
                    className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1 bg-white"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {programas.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.alcance === 'municipio' && user?.role === 'estatal' && (
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Municipio</label>
                  <select
                    value={form.municipioId}
                    onChange={(e) => setForm((p) => ({ ...p, municipioId: e.target.value }))}
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

              {form.alcance === 'obra' && (
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Obra</label>
                  <select
                    value={form.obraId}
                    onChange={(e) => setForm((p) => ({ ...p, obraId: e.target.value }))}
                    className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1 bg-white"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {obrasFiltradas.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.folio} — {o.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(form.tipo === 'sin_actualizaciones' || form.tipo === 'sin_estimaciones') && (
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Umbral (dias)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.umbralDias}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, umbralDias: Number(e.target.value) }))
                    }
                    className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1"
                  />
                </div>
              )}

              {form.tipo === 'retraso_fisico' && (
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">
                    Umbral desfase (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.umbralPorcentaje}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, umbralPorcentaje: Number(e.target.value) }))
                    }
                    className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1"
                  />
                </div>
              )}

              {form.tipo === 'exceso_presupuesto' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">Umbral (%)</label>
                    <input
                      type="number"
                      min={1}
                      value={form.umbralPorcentaje}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, umbralPorcentaje: Number(e.target.value) }))
                      }
                      className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">Umbral monto ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.umbralMonto}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, umbralMonto: Number(e.target.value) }))
                      }
                      className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md mt-1"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] text-gray-500 uppercase">
                  Destinatarios WhatsApp
                </label>
                <div className="mt-1 border border-gray-200 rounded-md max-h-36 overflow-y-auto">
                  {usersWithPhone.length === 0 ? (
                    <p className="text-xs text-gray-400 p-3">
                      No hay usuarios con telefono registrado.
                    </p>
                  ) : (
                    usersWithPhone.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 px-3 py-2 text-xs border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={form.destinatarioIds.includes(u.id)}
                          onChange={() => toggleDestinatario(u.id)}
                        />
                        <span className="font-medium">{u.fullName}</span>
                        <span className="text-gray-400">{u.telefono}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!simResult} onOpenChange={(open) => !open && setSimResult(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Simulacion de envio WhatsApp</DialogTitle>
            </DialogHeader>
            {simResult && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600">
                  Se generarian{' '}
                  <strong>{simResult.alertasGeneradas}</strong> alerta(s). Envio simulado
                  (demo).
                </p>
                {simResult.destinatarios.length === 0 ? (
                  <p className="text-gray-400">Sin destinatarios configurados.</p>
                ) : (
                  simResult.destinatarios.map((d, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 bg-green-50/50">
                      <div className="font-medium text-green-800">
                        {d.nombre} — {d.telefono}
                      </div>
                      <p className="text-gray-600 mt-1 whitespace-pre-wrap">{d.mensaje}</p>
                    </div>
                  ))
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" onClick={() => setSimResult(null)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar regla</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `Se eliminara la regla "${deleteTarget.nombre}". Esta accion no se puede deshacer.`
                  : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!busyId}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!!busyId}
                className="bg-red-600 hover:bg-red-700"
                onClick={(e) => {
                  e.preventDefault();
                  void handleDelete();
                }}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageState>
  );
}
