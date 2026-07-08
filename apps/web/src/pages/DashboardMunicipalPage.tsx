import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardExportActions } from '@/components/dashboard/DashboardExportActions';
import { EstimacionesPendientesList } from '@/components/EstimacionesPendientesList';
import { AttentionTodayPanel } from '@/components/dashboard/AttentionTodayPanel';
import { EvmSummaryChart } from '@/components/dashboard/EvmSummaryChart';
import { DataQualityWidget } from '@/components/dashboard/DataQualityWidget';
import { PageState } from '@/components/PageState';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  createContratista,
  createEstimacion,
  fetchAlertas,
  fetchAvancesByAccion,
  fetchContratistas,
  fetchEstimacionesByAccion,
  fetchMunicipio,
  fetchAcciones,
  fetchAttentionToday,
  fetchEvmPortfolio,
  fetchDataQuality,
  validateAvance,
  validateEstimacion,
} from '@/lib/api';
import { AccionFormModal } from '@/components/AccionFormModal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, UserPlus } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import type { AvanceMensual, Accion } from '@/types';
import { normalizeName } from '@/lib/api-mappers';
import { formatCurrencyM, formatPercentage, getAccionStatusColor, getAccionStatusLabel, getProgramaColor, getProgramaName } from '@/lib/utils';
import { getBrand } from '@/config/brand';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, DollarSign, AlertTriangle, TrendingUp, Users, FileText, CheckCircle } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } };

export default function DashboardMunicipalPage() {
  const brand = getBrand();
  const { entity } = brand;
  const { user } = useApp();
  const navigate = useNavigate();
  const municipioId = user?.municipioId ?? '';

  const load = useCallback(async () => {
    const [obras, contratistas, alertas, municipio] = await Promise.all([
      fetchAcciones(),
      fetchContratistas(),
      fetchAlertas(),
      municipioId ? fetchMunicipio(municipioId) : Promise.resolve(null),
    ]);
    const munObras = municipioId
      ? obras.filter((o) => o.municipioId === municipioId)
      : obras;
    const munNombre = municipio?.nombre ?? munObras[0]?.municipio ?? '';
    const munAlertas = alertas.filter(
      (a) => normalizeName(a.municipio) === normalizeName(munNombre),
    );
    const munContratistas = [...new Set(munObras.map((o) => o.contratistaId))]
      .map((id) => contratistas.find((c) => c.id === id))
      .filter(Boolean);

    const pendingAvances: { avance: AvanceMensual; obra: Accion }[] = [];
    for (const obra of munObras) {
      const avances = await fetchAvancesByAccion(obra.id);
      for (const avance of avances) {
        if (avance.estatus === 'pendiente' || avance.estatus === 'en_revision') {
          pendingAvances.push({ avance, obra });
        }
      }
    }

    const [attention, evm, dataQuality] = await Promise.all([
      fetchAttentionToday().catch(() => null),
      fetchEvmPortfolio().catch(() => null),
      fetchDataQuality().catch(() => null),
    ]);

    return { munObras, munContratistas, munAlertas, municipio, pendingAvances, attention, evm, dataQuality };
  }, [municipioId]);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const [estObraId, setEstObraId] = useState('');
  const [estNumero, setEstNumero] = useState('1');
  const [estPeriodo, setEstPeriodo] = useState('Marzo 2025');
  const [estMonto, setEstMonto] = useState('');
  const [estObs, setEstObs] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [obraModalOpen, setObraModalOpen] = useState(false);
  const [contratistaDialogOpen, setContratistaDialogOpen] = useState(false);
  const [conNombre, setConNombre] = useState('');
  const [conRfc, setConRfc] = useState('');
  const [conRepresentante, setConRepresentante] = useState('');
  const [conSubmitting, setConSubmitting] = useState(false);

  const handleValidateAvance = async (avanceId: string, reportado: number, approve: boolean) => {
    setBusyId(avanceId);
    setActionError(null);
    try {
      await validateAvance(avanceId, {
        validado: approve ? reportado : 0,
        comentarios: approve ? 'Validado por municipio' : 'Observado por municipio',
      });
      toast.success(approve ? 'Avance validado' : 'Avance observado');
      reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al validar avance';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateEstimacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estObraId || !estMonto) {
      setActionError(`Seleccione ${entity.singular} y monto.`);
      return;
    }
    const obra = data?.munObras.find((o) => o.id === estObraId);
    if (!obra) return;
    setBusyId('est');
    setActionError(null);
    try {
      const monto = Number(estMonto);
      const existing = await fetchEstimacionesByAccion(estObraId);
      const acumulado = existing.reduce((s, x) => s + x.montoEstimado, 0) + monto;
      const pct = obra.montoContratado > 0 ? (acumulado / obra.montoContratado) * 100 : 0;
      await createEstimacion(estObraId, {
        numero: Number(estNumero),
        periodo: estPeriodo,
        monto_estimado: monto,
        monto_acumulado: acumulado,
        porcentaje_financiero: pct,
        fecha_presentacion: new Date().toISOString().slice(0, 10),
      });
      setEstMonto('');
      setEstObs('');
      toast.success('Estimacion registrada');
      reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al guardar estimacion';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateContratista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conNombre.trim() || !conRfc.trim() || !conRepresentante.trim()) {
      toast.error('Complete nombre, RFC y representante.');
      return;
    }
    setConSubmitting(true);
    try {
      await createContratista({
        nombre: conNombre.trim(),
        rfc: conRfc.trim(),
        representante: conRepresentante.trim(),
      });
      toast.success('Contratista registrado');
      setContratistaDialogOpen(false);
      setConNombre('');
      setConRfc('');
      setConRepresentante('');
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al registrar contratista');
    } finally {
      setConSubmitting(false);
    }
  };

  const handleValidateEstimacion = async (estimacionId: string, aprobar: boolean) => {
    setBusyId(estimacionId);
    setActionError(null);
    try {
      await validateEstimacion(estimacionId, 'municipal', aprobar);
      toast.success(aprobar ? 'Estimacion validada' : 'Estimacion observada');
      reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al validar estimacion';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  if (!data) {
    return <PageState loading={loading} error={error} onRetry={reload}><span /></PageState>;
  }

  const { munObras, munContratistas, munAlertas, municipio, pendingAvances, attention, evm, dataQuality } = data;
  const municipioNombre = municipio?.nombre ?? munObras[0]?.municipio ?? 'Municipio';

  const totalObras = munObras.length;
  const obrasEjecucion = munObras.filter(o => o.estatus === 'en_ejecucion_a_tiempo' || o.estatus === 'en_ejecucion_retraso').length;
  const obrasRetraso = munObras.filter(o => o.estatus === 'en_ejecucion_retraso' || o.estatus === 'en_riesgo').length;
  const montoAutorizado = munObras.reduce((s, o) => s + o.montoAutorizado, 0);
  const avancePromedio = totalObras > 0 ? munObras.reduce((s, o) => s + o.avanceFisicoReal, 0) / totalObras : 0;
  const alertasPendientes = munAlertas.filter(a => !a.atendida);

  const kpis = [
    { label: `${entity.pluralCap} Municipales`, value: totalObras.toString(), sub: `${obrasEjecucion} en ejecución`, icon: Building2, color: brand.colors.primary },
    { label: 'Inversión Autorizada', value: formatCurrencyM(montoAutorizado), sub: 'Para su municipio', icon: DollarSign, color: brand.colors.accent },
    { label: 'Avance Promedio', value: formatPercentage(avancePromedio), sub: 'Avance fisico', icon: TrendingUp, color: '#3182CE', trend: avancePromedio },
    { label: `${entity.pluralCap} con Retraso`, value: obrasRetraso.toString(), sub: `${Math.round((obrasRetraso / totalObras) * 100)}% del total`, icon: AlertTriangle, color: '#DC2626' },
    { label: 'Contratistas', value: munContratistas.length.toString(), sub: 'Empresas asignadas', icon: Users, color: brand.colors.secondary },
    { label: 'Alertas', value: alertasPendientes.length.toString(), sub: 'Pendientes de atencion', icon: AlertTriangle, color: '#D69E2E' },
  ];

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-primary">Dashboard Municipal — {municipioNombre}</h1>
          <p className="text-xs text-gray-500 mt-1">Gestión de {entity.plural}, contratistas y avances de su municipio</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <DashboardExportActions />
          {user && (
            <Button type="button" size="sm" className="gap-2" onClick={() => setObraModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Nueva {entity.singular}
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={i} variants={item}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{kpi.label}</span>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                <div className="text-[11px] text-gray-500 mt-1">{kpi.sub}</div>
                {'trend' in kpi && kpi.trend !== undefined && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(kpi.trend, 100)}%`, backgroundColor: kpi.trend < 40 ? '#DC2626' : kpi.trend < 80 ? '#D69E2E' : '#38A169' }} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {(attention || evm || dataQuality) && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {attention && (
            <motion.div variants={item}>
              <AttentionTodayPanel data={attention} />
            </motion.div>
          )}
          {dataQuality && (
            <motion.div variants={item}>
              <DataQualityWidget data={dataQuality} />
            </motion.div>
          )}
          {evm && (
            <motion.div variants={item} className="xl:col-span-2">
              <EvmSummaryChart data={evm} />
            </motion.div>
          )}
        </div>
      )}

      <Tabs defaultValue="obras">
        <TabsList className="bg-white border border-gray-200 p-1 h-auto">
          <TabsTrigger value="obras" className="text-xs gap-1.5"><Building2 className="w-3.5 h-3.5" /> Mis {entity.pluralCap}</TabsTrigger>
          <TabsTrigger value="contratistas" className="text-xs gap-1.5"><Users className="w-3.5 h-3.5" /> Contratistas</TabsTrigger>
          <TabsTrigger value="validar" className="text-xs gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Validar Avances</TabsTrigger>
          <TabsTrigger value="estimaciones" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> Estimaciones</TabsTrigger>
        </TabsList>

        {/* Mis Obras Tab */}
        <TabsContent value="obras" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{entity.pluralCap} en su Municipio ({totalObras})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Nombre</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Programa</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Contratista</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500">Inversión</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Avance Físico</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Estatus</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Ver</th>
                  </tr></thead>
                  <tbody>
                    {munObras.map((obra) => (
                      <tr
                        key={obra.id}
                        role="link"
                        tabIndex={0}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:ring-inset"
                        onClick={() => navigate(`/acciones/${obra.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/acciones/${obra.id}`);
                          }
                        }}
                      >
                        <td className="py-2 px-2 font-medium text-gray-900 max-w-[150px] truncate">{obra.nombre}</td>
                        <td className="py-2 px-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: getProgramaColor(obra.programa) }}>{getProgramaName(obra.programa)}</span></td>
                        <td className="py-2 px-2 text-gray-600 max-w-[120px] truncate">{obra.contratista}</td>
                        <td className="py-2 px-2 text-right font-medium">{formatCurrencyM(obra.montoAutorizado)}</td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${obra.avanceFisicoReal}%`, backgroundColor: obra.avanceFisicoReal < 40 ? '#DC2626' : obra.avanceFisicoReal < 80 ? '#D69E2E' : '#38A169' }} />
                            </div>
                            <span className="text-[10px]">{obra.avanceFisicoReal}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: getAccionStatusColor(obra.estatus) }}>{getAccionStatusLabel(obra.estatus)}</span></td>
                        <td className="py-2 px-2 text-center">
                          <span className="text-brand-primary-light text-[10px] font-medium">Ver</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contratistas Tab */}
        <TabsContent value="contratistas" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">Contratistas Asignados ({munContratistas.length})</CardTitle>
                <p className="text-[11px] text-gray-500 font-normal mt-1">Seleccione un contratista para ver su panel y {entity.plural}.</p>
              </div>
              <Button type="button" size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => setContratistaDialogOpen(true)}>
                <UserPlus className="w-3.5 h-3.5" />
                Dar de alta
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {munContratistas.map((c) => {
                  if (!c) return null;
                  const cObras = munObras.filter(o => o.contratistaId === c.id);
                  return (
                    <div key={c.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/contratistas/${c.id}`)}>
                      <div className="w-10 h-10 rounded-lg bg-brand-secondary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {c.nombre.split(' ').map(w => w[0]).join('').substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{c.nombre}</p>
                        <p className="text-[10px] text-gray-500">RFC: {c.rfc}</p>
                        <p className="text-[10px] text-gray-500">{cObras.length} {entity.plural} | Avance {formatPercentage(c.avancePromedio)}</p>
                        {c.observacionesPendientes > 0 && <span className="text-[10px] text-red-500 font-medium">{c.observacionesPendientes} observaciones pendientes</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validar Avances Tab */}
        <TabsContent value="validar" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Avances Pendientes de Validación</CardTitle></CardHeader>
            <CardContent>
              {actionError && <p className="text-xs text-red-600 mb-3">{actionError}</p>}
              <div className="space-y-3">
                {pendingAvances.map(({ avance, obra }) => (
                  <div key={avance.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-900">{obra.nombre}</p>
                      <p className="text-[10px] text-gray-500">{avance.periodo} — reportado {avance.reportado}% | {obra.contratista}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={busyId === avance.id}
                        onClick={() => handleValidateAvance(avance.id, avance.reportado, true)}
                        className="px-3 py-1.5 bg-[#38A169] text-white text-[10px] font-medium rounded-md hover:bg-[#2F855A] disabled:opacity-60"
                      >
                        Validar
                      </button>
                      <button
                        type="button"
                        disabled={busyId === avance.id}
                        onClick={() => handleValidateAvance(avance.id, avance.reportado, false)}
                        className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-medium rounded-md hover:bg-red-600 disabled:opacity-60"
                      >
                        Observar
                      </button>
                    </div>
                  </div>
                ))}
                {pendingAvances.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No hay avances pendientes de validacion</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estimaciones Tab */}
        <TabsContent value="estimaciones" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Cargar Estimacion</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEstimacion}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block">{entity.singularCap}</label>
                    <select
                      value={estObraId}
                      onChange={(e) => setEstObraId(e.target.value)}
                      required
                      className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                    >
                      <option value="">Seleccionar {entity.singular}...</option>
                      {munObras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block">Numero de Estimacion</label>
                    <input
                      type="number"
                      min="1"
                      value={estNumero}
                      onChange={(e) => setEstNumero(e.target.value)}
                      className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block">Periodo</label>
                    <select
                      value={estPeriodo}
                      onChange={(e) => setEstPeriodo(e.target.value)}
                      className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                    >
                      <option>Enero 2025</option><option>Febrero 2025</option><option>Marzo 2025</option><option>Abril 2025</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block">Monto Estimado ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={estMonto}
                      onChange={(e) => setEstMonto(e.target.value)}
                      required
                      className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block">Observaciones</label>
                    <textarea
                      value={estObs}
                      onChange={(e) => setEstObs(e.target.value)}
                      className="w-full h-16 px-3 py-2 text-xs border border-gray-200 rounded-md resize-none"
                      placeholder="Observaciones sobre la estimacion..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="submit"
                    disabled={busyId === 'est'}
                    className="bg-brand-primary text-white px-4 py-2 rounded-md text-xs font-medium hover:bg-brand-primary-light disabled:opacity-60"
                  >
                    {busyId === 'est' ? 'Guardando...' : 'Guardar Estimacion'}
                  </button>
                </div>
              </form>
              <EstimacionesPendientesList
                obras={munObras}
                onValidate={handleValidateEstimacion}
                busyId={busyId}
              />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

    </motion.div>

    <Dialog open={contratistaDialogOpen} onOpenChange={setContratistaDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dar de alta contratista</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateContratista} className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Nombre o razón social</label>
            <input
              type="text"
              value={conNombre}
              onChange={(e) => setConNombre(e.target.value)}
              required
              className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">RFC</label>
            <input
              type="text"
              value={conRfc}
              onChange={(e) => setConRfc(e.target.value)}
              required
              maxLength={13}
              className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md uppercase"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Representante legal</label>
            <input
              type="text"
              value={conRepresentante}
              onChange={(e) => setConRepresentante(e.target.value)}
              required
              className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setContratistaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={conSubmitting}>
              {conSubmitting ? 'Guardando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {user && (
      <AccionFormModal
        open={obraModalOpen}
        onOpenChange={setObraModalOpen}
        user={user}
        onSuccess={reload}
      />
    )}
    </PageState>
  );
}
