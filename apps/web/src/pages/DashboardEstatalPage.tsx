import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageState } from '@/components/PageState';
import { MapaPuebla } from '@/components/dashboard/MapaPuebla';
import { useApp } from '@/context/AppContext';
import { ObraFormModal } from '@/components/ObraFormModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  fetchAlertas,
  fetchChartAvanceTimeline,
  fetchChartObrasPorEstatus,
  fetchChartObrasPorPrograma,
  fetchChartTopMunicipios,
  fetchDashboardKpis,
  fetchMunicipios,
  fetchObras,
} from '@/lib/api';
import { mapProgramaChartFromApi } from '@/lib/programa-chart';
import { normalizeName } from '@/lib/api-mappers';
import { formatCurrencyM, formatPercentage, getObraStatusColor, getObraStatusLabel, getSeverityColor, getSeverityLabel, getProgramaName } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2, DollarSign, Activity, AlertTriangle, TrendingUp, CreditCard,
  ArrowRight, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } };

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, setNotifications, setSelectedMunicipio } = useApp();
  const [obraModalOpen, setObraModalOpen] = useState(false);

  const load = useCallback(async () => {
    const [obras, municipios, alertas, kpis, topMunicipios, avanceTimeline, chartPrograma, obrasPorEstatus] =
      await Promise.all([
        fetchObras(),
        fetchMunicipios(),
        fetchAlertas(),
        fetchDashboardKpis(),
        fetchChartTopMunicipios().catch(() => []),
        fetchChartAvanceTimeline().catch(() => []),
        fetchChartObrasPorPrograma().catch(() => []),
        fetchChartObrasPorEstatus().catch(() => []),
      ]);
    const programas = mapProgramaChartFromApi(chartPrograma, obras);
    return {
      obras,
      municipios,
      alertas,
      kpis,
      programas,
      topMunicipios,
      avanceTimeline,
      obrasPorEstatus,
    };
  }, []);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  useEffect(() => {
    if (data?.alertas) {
      setNotifications(data.alertas.filter((a) => !a.atendida).length);
    }
    if (data?.municipios[0]) {
      setSelectedMunicipio(data.municipios[0].id);
    }
  }, [data, setNotifications, setSelectedMunicipio]);

  if (!data) {
    return <PageState loading={loading} error={error} onRetry={reload}><span /></PageState>;
  }

  const { obras, municipios, alertas, kpis, programas, topMunicipios, avanceTimeline, obrasPorEstatus } = data;

  const estatusChartData = obrasPorEstatus
    .filter((row) => row.estatus && (row.count ?? 0) > 0)
    .map((row) => ({
      name: getObraStatusLabel(row.estatus!),
      estatus: row.estatus!,
      count: row.count ?? 0,
      fill: getObraStatusColor(row.estatus!),
    }));
  const totalObras = kpis.total_obras || obras.length || 1;
  const obrasEjecucion = kpis.obras_en_ejecucion;
  const obrasRetraso = kpis.obras_retraso;
  const montoAutorizado = kpis.monto_autorizado;
  const montoEjercido = kpis.monto_ejercido;
  const avanceFisicoPromedio = kpis.avance_fisico_promedio;
  const alertasCriticas = kpis.alertas_criticas;
  const alertasAltas = kpis.alertas_altas;

  const chartData = obras.filter(o => o.montoAutorizado > 1000000).slice(0, 10).map(o => ({
    name: o.nombre.length > 25 ? o.nombre.substring(0, 25) + '...' : o.nombre,
    fisico: o.avanceFisicoReal,
    financiero: o.avanceFinanciero,
    diferencia: o.avanceFinanciero - o.avanceFisicoReal,
  }));

  const donaData = programas.map((p) => ({
    name: p.nombreCorto,
    value: p.montoTotal,
    color: p.color,
  }));

  const kpiCards = [
    { label: 'Total de Obras', value: totalObras.toString(), sub: `${obrasEjecucion} en ejecucion`, icon: Building2, color: '#1B3A5C', trend: null },
    { label: 'Inversion Autorizada', value: formatCurrencyM(montoAutorizado), sub: 'Presupuesto total', icon: DollarSign, color: '#E8913A', trend: null },
    { label: 'Obras en Ejecucion', value: obrasEjecucion.toString(), sub: `${Math.round((obrasEjecucion/totalObras)*100)}% del total`, icon: Activity, color: '#38A169', trend: Math.round((obrasEjecucion/totalObras)*100) },
    { label: 'Obras con Retraso', value: obrasRetraso.toString(), sub: `${Math.round((obrasRetraso/totalObras)*100)}% del total`, icon: AlertTriangle, color: '#DC2626', trend: null },
    { label: 'Avance Fisico Prom.', value: formatPercentage(avanceFisicoPromedio), sub: `Meta: 65%`, icon: TrendingUp, color: '#3182CE', trend: avanceFisicoPromedio },
    { label: 'Monto Ejercido', value: formatCurrencyM(montoEjercido), sub: `${Math.round((montoEjercido/montoAutorizado)*100)}% autorizado`, icon: CreditCard, color: '#0D7377', trend: (montoEjercido/montoAutorizado)*100 },
  ];

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex justify-end">
        {user && (
          <Button type="button" size="sm" className="gap-2" onClick={() => setObraModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Nueva obra
          </Button>
        )}
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi, i) => (
          <motion.div key={i} variants={item}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{kpi.label}</span>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <div className="text-xl font-bold text-gray-900" style={kpi.color === '#DC2626' ? { color: '#DC2626' } : {}}>{kpi.value}</div>
                <div className="text-[11px] text-gray-500 mt-1">{kpi.sub}</div>
                {kpi.trend !== null && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(kpi.trend, 100)}%`, backgroundColor: kpi.trend < 40 ? '#DC2626' : kpi.trend < 80 ? '#D69E2E' : '#38A169' }} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {avanceTimeline.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">Avance programado vs real (estatal)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={avanceTimeline.map((p) => ({ periodo: p.mes, programado: p.programado, real: p.real }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="programado" name="Programado" stroke="#A0AEC0" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="real" name="Real" stroke="#2C5282" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {estatusChartData.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">Obras por estatus</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={estatusChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => [`${value} obras`, 'Cantidad']} />
                  <Bar dataKey="count" name="Obras" radius={[0, 3, 3, 0]}>
                    {estatusChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Map + Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top 10 Municipios con mas Programas */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">Top 10 Municipios con mas Programas</CardTitle>
                <Badge variant="outline" className="text-[10px]">Por programas activos</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(topMunicipios.length ? topMunicipios : municipios.map((m) => ({
                  municipio: m.nombre,
                  obras_count: m.obras,
                }))).slice(0, 10).map((row, i) => {
                  const m = municipios.find(
                    (mun) => normalizeName(mun.nombre) === normalizeName(row.municipio ?? ''),
                  );
                  const munObras = obras.filter(
                    (o) =>
                      (m && o.municipioId === m.id) ||
                      normalizeName(o.municipio) === normalizeName(row.municipio ?? ''),
                  );
                  const progSet = new Set(munObras.map((o) => o.programa));
                  const progNames = [...progSet].slice(0, 3).map((p) => getProgramaName(p));
                  const count = row.obras_count ?? m?.obras ?? 0;
                  return (
                    <div
                      key={row.municipio ?? i}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer"
                      onClick={() => m && navigate(`/municipios/${m.id}`)}
                    >
                      <div className="w-7 h-7 rounded-full bg-[#1B3A5C] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">{row.municipio}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0D7377] text-white">{count} obras</span>
                        </div>
                        {m && (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-gray-500">{formatCurrencyM(m.inversionTotal)}</span>
                            <span className="text-[11px] text-gray-400">|</span>
                            <span className="text-[11px] text-gray-500">Avance {formatPercentage(m.avanceFisicoPromedio)}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {progNames.map((pn, j) => (
                            <span key={j} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600">{pn}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Avance Fisico vs Financiero */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">Avance Fisico vs. Financiero</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="fisico" name="Avance Fisico" fill="#2C5282" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="financiero" name="Avance Financiero" fill="#E8913A" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Donut + Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Inversion por Programa */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">Inversion por Programa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-[180px] h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donaData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                        {donaData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <text x="50%" y="45%" textAnchor="middle" style={{ fontSize: '9px', fill: '#718096' }}>Total</text>
                      <text x="50%" y="58%" textAnchor="middle" style={{ fontSize: '14px', fill: '#1B3A5C', fontWeight: 700 }}>{formatCurrencyM(montoAutorizado)}</text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {donaData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                      <span className="text-[11px] text-gray-600 flex-1">{d.name}</span>
                      <span className="text-[11px] font-semibold text-gray-900">{formatCurrencyM(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alertas Prioritarias */}
        <motion.div variants={item} className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">Alertas Prioritarias</CardTitle>
                <div className="flex items-center gap-2">
                  {alertasCriticas > 0 && <Badge className="bg-red-500 text-[10px]">{alertasCriticas} criticas</Badge>}
                  {alertasAltas > 0 && <Badge className="bg-orange-500 text-[10px]">{alertasAltas} altas</Badge>}
                  <button onClick={() => navigate('/alertas')} className="text-[11px] text-[#2C5282] hover:underline font-medium flex items-center gap-1">
                    Ver todas <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[310px] overflow-y-auto">
                {alertas.filter(a => !a.atendida).slice(0, 8).map((alerta) => (
                  <div key={alerta.id} className="flex gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="w-1 rounded-full flex-shrink-0" style={{ backgroundColor: getSeverityColor(alerta.severidad) }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: getSeverityColor(alerta.severidad) }} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{alerta.titulo}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{alerta.municipio} — {alerta.descripcion.substring(0, 60)}...</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: getSeverityColor(alerta.severidad) + '15', color: getSeverityColor(alerta.severidad) }}>
                              {getSeverityLabel(alerta.severidad)}
                            </span>
                            <span className="text-[10px] text-gray-400">{alerta.fechaGeneracion}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Ranking Municipal */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-900">Ranking de Municipios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">#</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Municipio</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">Total Obras</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">Inversion Total</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">Avance Fisico</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">Avance Financiero</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">Sem.</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {municipios.map((m, i) => {
                    const diff = m.avanceFinancieroPromedio - m.avanceFisicoPromedio;
                    const semColor = diff >= 15 ? '#DC2626' : diff >= 5 ? '#D69E2E' : '#38A169';
                    return (
                      <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/municipios/${m.id}`)}>
                        <td className="py-2.5 px-3 font-medium text-gray-900">{i + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">{m.nombre}</td>
                        <td className="py-2.5 px-3 text-center">{m.obras}</td>
                        <td className="py-2.5 px-3 text-center font-medium">{formatCurrencyM(m.inversionTotal)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${m.avanceFisicoPromedio}%`, backgroundColor: m.avanceFisicoPromedio < 40 ? '#DC2626' : m.avanceFisicoPromedio < 80 ? '#D69E2E' : '#38A169' }} />
                            </div>
                            <span className="text-[10px]">{formatPercentage(m.avanceFisicoPromedio)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center text-[10px]">{formatPercentage(m.avanceFinancieroPromedio)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="w-3 h-3 rounded-full mx-auto" style={{ backgroundColor: semColor }} />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button className="text-[#2C5282] hover:underline text-[10px] font-medium">Ver</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-900">Mapa de Obras por Municipio</CardTitle>
          </CardHeader>
          <CardContent>
            <MapaPuebla municipios={municipios} obras={obras} />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
    {user && (
      <ObraFormModal
        open={obraModalOpen}
        onOpenChange={setObraModalOpen}
        user={user}
        onSuccess={reload}
      />
    )}
    </PageState>
  );
}
