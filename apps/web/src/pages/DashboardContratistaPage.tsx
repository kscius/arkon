import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageState } from '@/components/PageState';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import { createAvance, fetchAlertas, fetchAvancesByObra, fetchEstimacionesByObra, fetchObras } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { formatCurrencyM, formatPercentage, getObraStatusColor, getObraStatusLabel, getProgramaColor, getProgramaName, getSeverityColor, getSeverityLabel } from '@/lib/utils';
import { getBrand } from '@/config/brand';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, DollarSign, TrendingUp, AlertTriangle, Upload, Calendar, Clock } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } };

export default function DashboardContratistaPage() {
  const brand = getBrand();
  const { entity } = brand;
  const { user } = useApp();
  const navigate = useNavigate();
  const contratistaId = user?.contratistaId ?? '';

  const load = useCallback(async () => {
    const [obras, alertas] = await Promise.all([fetchObras(), fetchAlertas()]);
    const misObras = contratistaId
      ? obras.filter((o) => o.contratistaId === contratistaId)
      : obras;
    const misAlertas = alertas.filter(
      (a) => misObras.some((o) => o.id === a.obraId) && !a.atendida,
    );

    const avancesPorObra = await Promise.all(
      misObras.map(async (obra) => ({
        obra,
        avances: await fetchAvancesByObra(obra.id),
      })),
    );
    const estimacionesPorObra = await Promise.all(
      misObras.map(async (obra) => ({
        obra,
        estimaciones: await fetchEstimacionesByObra(obra.id),
      })),
    );

    return { misObras, misAlertas, avancesPorObra, estimacionesPorObra };
  }, [contratistaId]);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const [obraId, setObraId] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [reportado, setReportado] = useState('');
  const [actividades, setActividades] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleReportar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraId || !reportado || !actividades.trim()) {
      setFormError(`Complete ${entity.singular}, avance y actividades.`);
      return;
    }
    const obra = data?.misObras.find((o) => o.id === obraId);
    if (!obra) return;
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await createAvance(obraId, {
        periodo,
        programado: obra.avanceFisicoProgramado,
        reportado: Number(reportado),
        actividades: actividades.trim(),
        comentarios: comentarios.trim(),
      });
      toast.success('Avance reportado correctamente');
      setFormSuccess('Avance reportado correctamente.');
      setReportado('');
      setActividades('');
      setComentarios('');
      reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al enviar el reporte.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const periodoOptions = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    for (const { avances } of data.avancesPorObra) {
      for (const a of avances) set.add(a.periodo);
    }
    const sorted = [...set].sort((a, b) => a.localeCompare(b));
    const now = new Date();
    const label = now.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
    const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
    if (!sorted.includes(capitalized)) sorted.push(capitalized);
    return sorted;
  }, [data]);

  useEffect(() => {
    if (periodoOptions.length && !periodo) {
      setPeriodo(periodoOptions[periodoOptions.length - 1] ?? '');
    }
  }, [periodoOptions, periodo]);

  const actividadReciente = useMemo(() => {
    if (!data) return [];
    const items: { key: string; fecha: string; tipo: string; titulo: string; desc: string }[] = [];
    for (const { obra, avances } of data.avancesPorObra) {
      for (const a of avances) {
        items.push({
          key: `av-${a.id}`,
          fecha: a.periodo,
          tipo: 'avance',
          titulo: 'Avance reportado',
          desc: `${obra.nombre}: ${a.reportado}% (${a.estatus})`,
        });
      }
    }
    for (const { obra, estimaciones } of data.estimacionesPorObra) {
      for (const e of estimaciones) {
        items.push({
          key: `est-${e.id}`,
          fecha: e.periodo,
          tipo: 'estimacion',
          titulo: `Estimacion #${e.numero}`,
          desc: `${obra.nombre} — ${e.estatus.replace(/_/g, ' ')}`,
        });
      }
    }
    return items.slice(-12).reverse();
  }, [data]);

  const entregablesPendientes = useMemo(() => {
    if (!data) return [];
    const today = Date.now();
    const daysUntil = (dateStr: string) => {
      const t = Date.parse(dateStr);
      if (Number.isNaN(t)) return 14;
      return Math.max(0, Math.ceil((t - today) / (1000 * 60 * 60 * 24)));
    };
    const items: { key: string; titulo: string; obra: string; fecha: string; dias: number; color: string }[] = [];
    for (const { obra, estimaciones } of data.estimacionesPorObra) {
      for (const e of estimaciones) {
        if (e.estatus === 'presentada' || e.estatus === 'en_revision_municipal') {
          const fecha = e.fechaPresentacion || e.periodo;
          const dias = daysUntil(fecha);
          items.push({
            key: `est-${e.id}`,
            titulo: `Estimacion #${e.numero}`,
            obra: obra.nombre,
            fecha,
            dias,
            color: dias <= 7 ? '#DC2626' : '#3182CE',
          });
        }
      }
    }
    for (const { obra, avances } of data.avancesPorObra) {
      const pending = avances.filter((a) => a.estatus === 'pendiente' || a.estatus === 'en_revision');
      const last = pending[pending.length - 1];
      if (last) {
        items.push({
          key: `av-pend-${last.id}`,
          titulo: 'Avance pendiente de validacion',
          obra: obra.nombre,
          fecha: last.periodo,
          dias: 7,
          color: '#D69E2E',
        });
      }
    }
    return items.slice(0, 6);
  }, [data]);

  if (!data) {
    return <PageState loading={loading} error={error} onRetry={reload}><span /></PageState>;
  }

  const { misObras, misAlertas } = data;

  const totalObras = misObras.length;
  const obrasEjecucion = misObras.filter(o => o.estatus === 'en_ejecucion_a_tiempo' || o.estatus === 'en_ejecucion_retraso').length;
  const obrasRetraso = misObras.filter(o => o.estatus === 'en_ejecucion_retraso' || o.estatus === 'en_riesgo').length;
  const montoTotal = misObras.reduce((s, o) => s + o.montoAutorizado, 0);
  const avancePromedio = totalObras > 0 ? misObras.reduce((s, o) => s + o.avanceFisicoReal, 0) / totalObras : 0;

  const kpis = [
    { label: `Mis ${entity.pluralCap}`, value: totalObras.toString(), sub: `${obrasEjecucion} en ejecución`, icon: Building2, color: brand.colors.primary },
    { label: 'Inversion Total', value: formatCurrencyM(montoTotal), sub: 'Monto contratado', icon: DollarSign, color: brand.colors.accent },
    { label: 'Avance Promedio', value: formatPercentage(avancePromedio), sub: 'Avance fisico', icon: TrendingUp, color: '#3182CE', trend: avancePromedio },
    { label: `${entity.pluralCap} con Retraso`, value: obrasRetraso.toString(), sub: 'Requieren atencion', icon: AlertTriangle, color: '#DC2626' },
  ];

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-brand-primary">Panel del Contratista</h1>
        <p className="text-xs text-gray-500 mt-1">Bienvenido, {user?.name}. Aquí puede gestionar sus {entity.plural} asignadas y reportar avances.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={i} variants={item}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{kpi.label}</span>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <div className="text-xl font-bold text-gray-900" style={kpi.color === '#DC2626' ? { color: '#DC2626' } : {}}>{kpi.value}</div>
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

      <Tabs defaultValue="obras">
        <TabsList className="bg-white border border-gray-200 p-1 h-auto">
          <TabsTrigger value="obras" className="text-xs gap-1.5"><Building2 className="w-3.5 h-3.5" /> Mis {entity.pluralCap}</TabsTrigger>
          <TabsTrigger value="reportar" className="text-xs gap-1.5"><Upload className="w-3.5 h-3.5" /> Reportar Avance</TabsTrigger>
          <TabsTrigger value="actividad" className="text-xs gap-1.5"><Clock className="w-3.5 h-3.5" /> Actividad</TabsTrigger>
        </TabsList>

        {/* Mis Obras Tab */}
        <TabsContent value="obras" className="mt-4">
          <div className="space-y-3">
            {misObras.map((obra) => (
              <motion.div key={obra.id} variants={item}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/acciones/${obra.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900">{obra.nombre}</h3>
                          <Badge style={{ backgroundColor: getProgramaColor(obra.programa), color: 'white' }} className="text-[9px]">{getProgramaName(obra.programa)}</Badge>
                          <Badge style={{ backgroundColor: getObraStatusColor(obra.estatus), color: 'white' }} className="text-[9px]">{getObraStatusLabel(obra.estatus)}</Badge>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">{obra.municipio} | {obra.localidad} | {formatCurrencyM(obra.montoAutorizado)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Folio: {obra.folio}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-center">
                          <div className="text-[10px] text-gray-500">Fisico</div>
                          <div className="text-sm font-bold" style={{ color: obra.avanceFisicoReal < 40 ? '#DC2626' : obra.avanceFisicoReal < 80 ? '#D69E2E' : '#38A169' }}>{obra.avanceFisicoReal}%</div>
                          <div className="w-16 h-1 bg-gray-100 rounded-full mt-1">
                            <div className="h-full rounded-full" style={{ width: `${obra.avanceFisicoReal}%`, backgroundColor: obra.avanceFisicoReal < 40 ? '#DC2626' : obra.avanceFisicoReal < 80 ? '#D69E2E' : '#38A169' }} />
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-gray-500">Financiero</div>
                          <div className="text-sm font-bold text-blue-600">{obra.avanceFinanciero}%</div>
                          <div className="w-16 h-1 bg-gray-100 rounded-full mt-1">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${obra.avanceFinanciero}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    {obra.evidenciaFotografica.length > 0 && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        {obra.evidenciaFotografica.slice(0, 3).map((img, i) => (
                          <img key={i} src={img} alt="" className="w-16 h-12 object-cover rounded border border-gray-200" />
                        ))}
                        {obra.evidenciaFotografica.length > 3 && <span className="text-[10px] text-gray-400 self-center">+{obra.evidenciaFotografica.length - 3} mas</span>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Reportar Avance Tab */}
        <TabsContent value="reportar" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Upload className="w-4 h-4" /> Reportar Avance Fisico</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleReportar}>
                {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md p-2">{formError}</p>}
                {formSuccess && <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-md p-2">{formSuccess}</p>}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block font-medium">{entity.singularCap} *</label>
                    <select
                      value={obraId}
                      onChange={(e) => setObraId(e.target.value)}
                      required
                      className="w-full h-10 px-3 text-xs border border-gray-200 rounded-md bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                    >
                      <option value="">Seleccionar {entity.singular}...</option>
                      {misObras.filter(o => o.estatus.includes('ejecucion') || o.estatus === 'en_preparacion').map(o => (
                        <option key={o.id} value={o.id}>{o.nombre} ({o.avanceFisicoReal}%)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block font-medium">Periodo *</label>
                    <select
                      value={periodo}
                      onChange={(e) => setPeriodo(e.target.value)}
                      required
                      className="w-full h-10 px-3 text-xs border border-gray-200 rounded-md bg-white focus:border-brand-primary outline-none"
                    >
                      <option value="">Seleccionar periodo...</option>
                      {periodoOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block font-medium">Avance Fisico Acumulado (%) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={reportado}
                      onChange={(e) => setReportado(e.target.value)}
                      required
                      className="w-full h-10 px-3 text-xs border border-gray-200 rounded-md focus:border-brand-primary outline-none"
                      placeholder="0 - 100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase mb-1 block font-medium">Actividades Ejecutadas *</label>
                  <textarea
                    value={actividades}
                    onChange={(e) => setActividades(e.target.value)}
                    required
                    className="w-full h-24 px-3 py-2 text-xs border border-gray-200 rounded-md resize-none focus:border-brand-primary outline-none"
                    placeholder="Describa las actividades realizadas en este periodo..."
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase mb-1 block font-medium">Incidencias / Comentarios</label>
                  <textarea
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    className="w-full h-16 px-3 py-2 text-xs border border-gray-200 rounded-md resize-none focus:border-brand-primary outline-none"
                    placeholder="Reporte cualquier incidencia o comentario relevante..."
                  />
                </div>

                <p className="text-[10px] text-gray-400">La carga de evidencia fotografica estara disponible en una siguiente version.</p>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-brand-primary text-white px-6 py-2.5 rounded-md text-xs font-medium hover:bg-brand-primary-light transition-colors disabled:opacity-60"
                  >
                    {submitting ? 'Enviando...' : 'Enviar Reporte'}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actividad Tab */}
        <TabsContent value="actividad" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4" /> Historial de Actividad</CardTitle></CardHeader>
              <CardContent>
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
                  {actividadReciente.length === 0 && (
                    <p className="text-xs text-gray-500 pl-2">Sin actividad registrada en sus {entity.plural}.</p>
                  )}
                  {actividadReciente.map((act) => (
                    <div key={act.key} className="relative">
                      <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full border-2 border-white"
                        style={{ backgroundColor: act.tipo === 'avance' ? '#38A169' : act.tipo === 'observacion' ? '#DC2626' : act.tipo === 'estimacion' ? brand.colors.accent : '#3182CE' }} />
                      <div className="text-[10px] text-gray-400">{act.fecha}</div>
                      <div className="text-xs font-medium text-gray-800">{act.titulo}</div>
                      <div className="text-[11px] text-gray-600">{act.desc}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Calendario de entregables */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Calendar className="w-4 h-4" /> Proximos Entregables</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {entregablesPendientes.length === 0 && (
                    <p className="text-xs text-gray-500">No hay entregables pendientes.</p>
                  )}
                  {entregablesPendientes.map((ent) => (
                    <div key={ent.key} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ent.color + '15' }}>
                        <Calendar className="w-4 h-4" style={{ color: ent.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{ent.titulo}</p>
                        <p className="text-[10px] text-gray-500">{ent.obra}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-gray-500">{ent.fecha}</p>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: ent.color + '15', color: ent.color }}>
                          {ent.dias <= 7 ? '¡Urgente!' : `${ent.dias} dias`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alertas del contratista */}
      {misAlertas.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-600" /> Alertas sobre sus {entity.pluralCap}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {misAlertas.slice(0, 5).map((alerta) => (
                  <div key={alerta.id} className="flex gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="w-1 rounded-full flex-shrink-0" style={{ backgroundColor: getSeverityColor(alerta.severidad) }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900">{alerta.titulo}</p>
                      <p className="text-[10px] text-gray-500">{alerta.descripcion.substring(0, 100)}...</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: getSeverityColor(alerta.severidad) + '15', color: getSeverityColor(alerta.severidad) }}>{getSeverityLabel(alerta.severidad)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
    </PageState>
  );
}
