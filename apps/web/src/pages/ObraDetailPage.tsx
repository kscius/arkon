import { useParams, useSearchParams } from 'react-router-dom';
import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageState } from '@/components/PageState';
import { ObraFormModal } from '@/components/ObraFormModal';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  createObservacion,
  downloadDocumentoFile,
  fetchAvancesByObra,
  fetchDocumentosByObra,
  fetchEstimacionesByObra,
  fetchObra,
  fetchObservacionesByObra,
  updateDocumentoEstatus,
  updateObservacionEstatus,
  uploadDocumento,
  validateEstimacion,
} from '@/lib/api';
import { toast } from 'sonner';
import type { DocStatus } from '@/types';
import { ApiError } from '@/lib/api-client';
import type { DocCategoria, Documento } from '@/types';
import { formatCurrency, formatPercentage, formatDate, formatNumber as formatCount, getObraStatusColor, getObraStatusLabel, getRiesgoColor, getRiesgoLabel, getProgramaColor, getProgramaName, getSeverityColor, getSeverityLabel, getTipoObraLabel } from '@/lib/utils';
import { getBrand } from '@/config/brand';
import { parseEjercicioFromFolio } from '@/lib/proagua-access';
import { isValidUuid } from '@/lib/ids';
import { FichaProaguaSection } from '@/components/proagua/FichaProaguaSection';
import { CofinanciamientoTable } from '@/components/proagua/CofinanciamientoTable';
import { AvanceTrimestralPanel } from '@/components/proagua/AvanceTrimestralPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Activity, DollarSign, Folder, MessageSquare, AlertCircle, FileText, Image, Droplets } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const DOC_CATEGORY_LABELS: Record<DocCategoria, string> = {
  administrativa: 'Documentación Administrativa',
  tecnica: 'Documentación Técnica',
  ejecucion: 'Documentación de Ejecución',
  cierre: 'Documentación de Cierre',
  programa: 'Entregables del Programa',
};

export default function ObraDetailPage() {
  const brand = getBrand();
  const { entity } = brand;
  const isConagua = brand.tenantId === 'conagua';
  const { obraId } = useParams<{ obraId: string }>();
  const { user } = useApp();
  const [searchParams] = useSearchParams();
  const VALID_TABS = ['avance', 'estimaciones', 'expediente', 'observaciones', 'proagua'];
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    requestedTab && VALID_TABS.includes(requestedTab) ? requestedTab : 'avance',
  );

  const [docFile, setDocFile] = useState<File | null>(null);
  const [docNombre, setDocNombre] = useState('');
  const [docCategoria, setDocCategoria] = useState<DocCategoria>('administrativa');
  const [docSubmitting, setDocSubmitting] = useState(false);

  const [obsTipo, setObsTipo] = useState('tecnica');
  const [obsSeveridad, setObsSeveridad] = useState('media');
  const [obsDescripcion, setObsDescripcion] = useState('');
  const [obsResponsable, setObsResponsable] = useState('');
  const [obsSubmitting, setObsSubmitting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busyEstId, setBusyEstId] = useState<string | null>(null);
  const [obsStatusBusy, setObsStatusBusy] = useState(false);
  const [docStatusBusy, setDocStatusBusy] = useState<string | null>(null);
  const [editObraOpen, setEditObraOpen] = useState(false);

  const load = useCallback(async () => {
    if (!obraId) throw new Error(`${entity.singularCap} no especificada`);
    if (!isValidUuid(obraId)) {
      throw new Error(
        `Identificador de ${entity.singular} no válido. Abra la ${entity.singular} desde el catálogo o use el enlace con UUID.`,
      );
    }
    const obra = await fetchObra(obraId);
    const [obraAvances, obraEstimaciones, obraObservaciones, documentos] = await Promise.all([
      fetchAvancesByObra(obraId),
      fetchEstimacionesByObra(obraId),
      fetchObservacionesByObra(obraId).catch(() => []),
      fetchDocumentosByObra(obraId).catch(() => [] as Documento[]),
    ]);
    return { obra, obraAvances, obraEstimaciones, obraObservaciones, documentos };
  }, [obraId, entity]);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const handleUploadDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraId || !docFile || !docNombre.trim()) {
      setActionError('Seleccione archivo y nombre.');
      return;
    }
    setDocSubmitting(true);
    setActionError(null);
    try {
      const fd = new FormData();
      fd.append('file', docFile);
      fd.append('categoria', docCategoria);
      fd.append('nombre', docNombre.trim());
      fd.append('tipo', docFile.type.includes('pdf') ? 'pdf' : 'imagen');
      await uploadDocumento(obraId, fd);
      setDocFile(null);
      setDocNombre('');
      toast.success('Documento cargado correctamente');
      reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al subir documento';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setDocSubmitting(false);
    }
  };

  const handleCreateObservacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraId || !obsDescripcion.trim()) {
      setActionError('Indique la descripción de la observación.');
      return;
    }
    setObsSubmitting(true);
    setActionError(null);
    try {
      await createObservacion(obraId, {
        fecha: new Date().toISOString().slice(0, 10),
        tipo: obsTipo,
        descripcion: obsDescripcion.trim(),
        severidad: obsSeveridad,
        responsable: obsResponsable || data?.obra.contratista,
      });
      setObsDescripcion('');
      toast.success('Observación registrada');
      reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al crear observacion';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setObsSubmitting(false);
    }
  };

  const handleValidateEstatal = async (estimacionId: string, aprobar: boolean) => {
    setBusyEstId(estimacionId);
    setActionError(null);
    try {
      await validateEstimacion(estimacionId, 'estatal', aprobar);
      toast.success(aprobar ? 'Estimacion autorizada' : 'Estimacion observada');
      reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error en validación estatal';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setBusyEstId(null);
    }
  };

  const docCategories = useMemo(() => {
    if (!data?.documentos) return [];
    const byCat = new Map<DocCategoria, Documento[]>();
    for (const doc of data.documentos) {
      const list = byCat.get(doc.categoria) ?? [];
      list.push(doc);
      byCat.set(doc.categoria, list);
    }
    return (Object.keys(DOC_CATEGORY_LABELS) as DocCategoria[]).map((key) => ({
      key,
      label: DOC_CATEGORY_LABELS[key],
      docs: byCat.get(key) ?? [],
    }));
  }, [data]);

  if (!data) {
    return <PageState loading={loading} error={error} onRetry={reload}><span /></PageState>;
  }

  const { obra, obraAvances, obraEstimaciones, obraObservaciones } = data;

  const chartData = obraAvances.map((a) => ({
    periodo: a.periodo,
    programado: a.programado,
    reportado: a.reportado,
    validado: a.validado || 0,
  }));

  const getDocStatusColor = (s: string) => {
    const colors: Record<string, string> = { validado: '#38A169', cargado: '#3182CE', en_revision: '#D69E2E', observado: '#DC2626', no_cargado: '#A0AEC0' };
    return colors[s] || '#A0AEC0';
  };

  const getDocStatusLabel = (s: string) => {
    const labels: Record<string, string> = { validado: 'Validado', cargado: 'Cargado', en_revision: 'En revision', observado: 'Observado', no_cargado: 'Pendiente' };
    return labels[s] || s;
  };

  const canValidateEstatal = user?.role === 'estatal';
  const canManageObra = user?.role === 'estatal' || user?.role === 'municipal';
  const canManageObs = user?.role === 'estatal' || user?.role === 'municipal';
  const canManageObsEstatus = canManageObs;
  const canManageDocEstatus = canManageObs;

  const handleDocumentoEstatus = async (docId: string, estatus: DocStatus) => {
    setDocStatusBusy(docId);
    setActionError(null);
    try {
      await updateDocumentoEstatus(docId, estatus);
      toast.success('Estatus del documento actualizado');
      reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo actualizar el documento';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setDocStatusBusy(null);
    }
  };

  const handleObsEstatus = async (obsId: string, estatus: string) => {
    setObsStatusBusy(true);
    setActionError(null);
    try {
      await updateObservacionEstatus(obsId, estatus);
      toast.success('Estatus de observacion actualizado');
      reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo actualizar estatus';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setObsStatusBusy(false);
    }
  };

  const estatalPending = (estatus: string, validacionMunicipal: boolean, validacionEstatal: boolean) =>
    validacionMunicipal &&
    !validacionEstatal &&
    (estatus === 'validada_municipio' || estatus === 'en_revision_estatal');

  return (
    <div className="space-y-6">
      {actionError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{actionError}</p>
      )}
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-lg lg:text-xl font-bold text-brand-primary">{obra.nombre}</h1>
              <Badge style={{ backgroundColor: getObraStatusColor(obra.estatus), color: 'white' }} className="text-[10px]">
                {getObraStatusLabel(obra.estatus)}
              </Badge>
              <Badge style={{ backgroundColor: getProgramaColor(obra.programa), color: 'white' }} className="text-[10px]">
                {getProgramaName(obra.programa)}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">{obra.municipio} — {obra.localidad}</p>
            <p className="text-xs text-gray-400 mt-1">Folio: {obra.folio}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManageObra && user && (
              <>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditObraOpen(true)}>
                  {`Editar ${entity.singular}`}
                </Button>
                <ObraFormModal
                  open={editObraOpen}
                  onOpenChange={setEditObraOpen}
                  user={user}
                  obra={obra}
                  onSuccess={reload}
                />
              </>
            )}
            <Badge variant="outline" className="text-[10px] flex items-center gap-1">
              <AlertCircle className="w-3 h-3" style={{ color: getRiesgoColor(obra.riesgo) }} />
              Riesgo: {getRiesgoLabel(obra.riesgo)}
            </Badge>
          </div>
        </div>

        {/* Progress bars */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Avance Físico</span>
              <span className="font-semibold text-gray-900">{formatPercentage(obra.avanceFisicoReal)}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${obra.avanceFisicoReal}%`, backgroundColor: obra.avanceFisicoReal < 40 ? '#DC2626' : obra.avanceFisicoReal < 80 ? '#D69E2E' : '#38A169' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Avance Financiero</span>
              <span className="font-semibold text-gray-900">{formatPercentage(obra.avanceFinanciero)}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${obra.avanceFinanciero}%`, backgroundColor: '#3182CE' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Programado al mes actual</span>
              <span className="font-semibold text-gray-900">{formatPercentage(obra.avanceFisicoProgramado)}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${obra.avanceFisicoProgramado}%`, backgroundColor: '#A0AEC0' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Ficha Técnica */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-900">Ficha Técnica</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
            {[
              { label: 'CONTRATISTA', value: obra.contratista },
              { label: 'SUPERVISOR', value: obra.supervisor },
              { label: 'MONTO AUTORIZADO', value: formatCurrency(obra.montoAutorizado) },
              { label: 'MONTO CONTRATADO', value: formatCurrency(obra.montoContratado) },
              { label: 'MONTO EJERCIDO', value: formatCurrency(obra.montoEjercido) },
              { label: 'POBLACION BENEFICIADA', value: `${formatCount(obra.poblacionBeneficiada)} habitantes` },
              { label: 'FECHA DE INICIO', value: formatDate(obra.fechaInicio) },
              { label: 'FECHA TERMINO', value: formatDate(obra.fechaTerminoProgramada) },
              { label: 'PLAZO', value: `${obra.plazoEjecucion} días` },
              { label: `Tipo de ${entity.singular}`.toUpperCase(), value: getTipoObraLabel(obra.tipoObra.toLowerCase()) },
              { label: 'DEPENDENCIA', value: obra.dependencia },
              { label: 'PROGRAMA', value: getProgramaName(obra.programa) },
            ].map((field, i) => (
              <div key={i}>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{field.label}</div>
                <div className="text-xs font-medium text-gray-900">{field.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isConagua && <FichaProaguaSection obra={obra} defaultOpen />}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200 p-1 h-auto flex flex-wrap">
          <TabsTrigger value="avance" className="text-xs gap-1.5 data-[state=active]:bg-brand-primary data-[state=active]:text-white"><Activity className="w-3.5 h-3.5" /> Avance Físico</TabsTrigger>
          <TabsTrigger value="estimaciones" className="text-xs gap-1.5 data-[state=active]:bg-brand-primary data-[state=active]:text-white"><DollarSign className="w-3.5 h-3.5" /> Estimaciones</TabsTrigger>
          <TabsTrigger value="expediente" className="text-xs gap-1.5 data-[state=active]:bg-brand-primary data-[state=active]:text-white"><Folder className="w-3.5 h-3.5" /> Expediente</TabsTrigger>
          <TabsTrigger value="observaciones" className="text-xs gap-1.5 data-[state=active]:bg-brand-primary data-[state=active]:text-white"><MessageSquare className="w-3.5 h-3.5" /> Observaciones {obraObservaciones.length > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1 text-[9px]">{obraObservaciones.length}</span>}</TabsTrigger>
          {isConagua && (
            <TabsTrigger value="proagua" className="text-xs gap-1.5 data-[state=active]:bg-brand-primary data-[state=active]:text-white"><Droplets className="w-3.5 h-3.5" /> PROAGUA</TabsTrigger>
          )}
        </TabsList>

        <AnimatePresence mode="wait">
          {/* Avance Fisico Tab */}
          <TabsContent value="avance" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Card className="mb-4">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Avance en el Tiempo</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="programado" name="Programado" stroke="#A0AEC0" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="reportado" name="Reportado" stroke={brand.colors.primaryLight} strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="validado" name="Validado" stroke="#38A169" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Avances Mensuales</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Periodo</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Programado</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Reportado</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Validado</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Variacion</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Estatus</th>
                      </tr></thead>
                      <tbody>
                        {obraAvances.map((a) => (
                          <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-2 font-medium">{a.periodo}</td>
                            <td className="py-2 px-2 text-center">{a.programado}%</td>
                            <td className="py-2 px-2 text-center">{a.reportado}%</td>
                            <td className="py-2 px-2 text-center">{a.validado ? `${a.validado}%` : '—'}</td>
                            <td className="py-2 px-2 text-center">
                              <span className={a.variacion < 0 ? 'text-red-500' : a.variacion > 0 ? 'text-green-600' : 'text-gray-400'}>
                                {a.variacion > 0 ? '+' : ''}{a.variacion}%
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: a.estatus === 'validado' ? '#38A16915' : a.estatus === 'en_revision' ? '#D69E2E15' : '#A0AEC015', color: a.estatus === 'validado' ? '#38A169' : a.estatus === 'en_revision' ? '#D69E2E' : '#A0AEC0' }}>
                                {a.estatus === 'validado' ? 'Validado' : a.estatus === 'en_revision' ? 'En revision' : a.estatus === 'observado' ? 'Observado' : 'Pendiente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Evidence Photos */}
              {obra.evidenciaFotografica.length > 0 && (
                <Card className="mt-4">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Image className="w-4 h-4" /> Evidencia Fotografica</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {obra.evidenciaFotografica.map((img, i) => (
                        <div key={i} className="relative group">
                          <img src={img} alt={`Evidencia ${i + 1}`} className="w-full h-32 object-cover rounded-lg border border-gray-200 group-hover:shadow-md transition-shadow" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          {/* Estimaciones Tab */}
          <TabsContent value="estimaciones" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Registro de Estimaciones</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-gray-200">
                        <th className="text-center py-2 px-2 font-medium text-gray-500">#</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Periodo</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500">Monto Estimado</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500">Acumulado</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">% Financiero</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Estatus</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Validación</th>
                      </tr></thead>
                      <tbody>
                        {obraEstimaciones.map((e) => (
                          <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-2 text-center font-medium">{e.numero}</td>
                            <td className="py-2 px-2">{e.periodo}</td>
                            <td className="py-2 px-2 text-right">{formatCurrency(e.montoEstimado)}</td>
                            <td className="py-2 px-2 text-right">{formatCurrency(e.montoAcumulado)}</td>
                            <td className="py-2 px-2 text-center">{e.porcentajeFinanciero.toFixed(1)}%</td>
                            <td className="py-2 px-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: e.estatus === 'pagada' ? '#38A16915' : e.estatus.includes('revision') ? '#D69E2E15' : e.estatus === 'no_presentada' ? '#A0AEC015' : '#DC262615', color: e.estatus === 'pagada' ? '#38A169' : e.estatus.includes('revision') ? '#D69E2E' : e.estatus === 'no_presentada' ? '#A0AEC0' : '#DC2626' }}>
                                {e.estatus === 'pagada' ? 'Pagada' : e.estatus === 'autorizada' ? 'Autorizada' : e.estatus === 'en_revision_estatal' ? 'Rev. Estatal' : e.estatus === 'en_revision_municipal' ? 'Rev. Municipal' : e.estatus === 'validada_municipio' ? 'Val. Municipio' : e.estatus === 'presentada' ? 'Presentada' : e.estatus === 'observada_municipio' ? 'Obs. Municipio' : 'No presentada'}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex justify-center gap-1">
                                  <span className={`text-[10px] px-1 rounded ${e.validacionMunicipal ? 'text-green-600' : 'text-gray-300'}`}>M</span>
                                  <span className={`text-[10px] px-1 rounded ${e.validacionEstatal ? 'text-green-600' : 'text-gray-300'}`}>E</span>
                                </div>
                                {canValidateEstatal && estatalPending(e.estatus, e.validacionMunicipal, e.validacionEstatal) && (
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      disabled={busyEstId === e.id}
                                      onClick={() => handleValidateEstatal(e.id, true)}
                                      className="text-[9px] px-2 py-0.5 bg-green-600 text-white rounded disabled:opacity-60"
                                    >
                                      Autorizar
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busyEstId === e.id}
                                      onClick={() => handleValidateEstatal(e.id, false)}
                                      className="text-[9px] px-2 py-0.5 bg-red-500 text-white rounded disabled:opacity-60"
                                    >
                                      Observar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {obra.avanceFinanciero > obra.avanceFisicoReal && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-yellow-800">Alerta: Desviación Físico-Financiera</p>
                    <p className="text-[11px] text-yellow-700">El avance financiero ({formatPercentage(obra.avanceFinanciero)}) supera el físico ({formatPercentage(obra.avanceFisicoReal)}) por {(obra.avanceFinanciero - obra.avanceFisicoReal).toFixed(1)} puntos.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* Expediente Tab */}
          <TabsContent value="expediente" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{`Expediente Digital de ${entity.singularCap}`}</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleUploadDocumento} className="mb-4 p-3 border border-dashed border-gray-200 rounded-lg space-y-3">
                    <p className="text-xs font-medium text-gray-700">Subir documento</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                        className="text-xs"
                      />
                      <input
                        type="text"
                        value={docNombre}
                        onChange={(e) => setDocNombre(e.target.value)}
                        placeholder="Nombre del documento"
                        className="h-9 px-2 text-xs border border-gray-200 rounded-md"
                      />
                      <select
                        value={docCategoria}
                        onChange={(e) => setDocCategoria(e.target.value as DocCategoria)}
                        className="h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                      >
                        {(Object.keys(DOC_CATEGORY_LABELS) as DocCategoria[]).map((k) => (
                          <option key={k} value={k}>{DOC_CATEGORY_LABELS[k]}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={docSubmitting}
                      className="bg-brand-primary text-white px-4 py-2 rounded-md text-xs font-medium disabled:opacity-60"
                    >
                      {docSubmitting ? 'Subiendo...' : 'Cargar documento'}
                    </button>
                  </form>
                  <Accordion type="multiple" defaultValue={['administrativa']} className="space-y-2">
                    {docCategories.map((cat) => (
                      <AccordionItem key={cat.key} value={cat.key} className="border border-gray-200 rounded-lg px-3">
                        <AccordionTrigger className="text-xs font-medium py-3 hover:no-underline">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            {cat.label}
                            <span className="text-[10px] text-gray-400 ml-2">({cat.docs.length} documentos)</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pb-3">
                            {cat.docs.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span className="text-xs text-gray-700 truncate">{doc.nombre}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                                  <button
                                    type="button"
                                    onClick={() => downloadDocumentoFile(doc.id, doc.nombre).catch(() => {
                                      setActionError('No se pudo descargar');
                                      toast.error('No se pudo descargar');
                                    })}
                                    className="text-[10px] text-brand-primary-light hover:underline"
                                  >
                                    Descargar
                                  </button>
                                  {canManageDocEstatus && (
                                    <>
                                      {doc.estatus !== 'en_revision' && (
                                        <button
                                          type="button"
                                          disabled={docStatusBusy === doc.id}
                                          onClick={() => handleDocumentoEstatus(doc.id, 'en_revision')}
                                          className="text-[10px] text-[#D69E2E] hover:underline disabled:opacity-50"
                                        >
                                          En revision
                                        </button>
                                      )}
                                      {doc.estatus !== 'validado' && (
                                        <button
                                          type="button"
                                          disabled={docStatusBusy === doc.id}
                                          onClick={() => handleDocumentoEstatus(doc.id, 'validado')}
                                          className="text-[10px] text-[#38A169] hover:underline disabled:opacity-50"
                                        >
                                          Validar
                                        </button>
                                      )}
                                      {doc.estatus !== 'observado' && (
                                        <button
                                          type="button"
                                          disabled={docStatusBusy === doc.id}
                                          onClick={() => handleDocumentoEstatus(doc.id, 'observado')}
                                          className="text-[10px] text-[#DC2626] hover:underline disabled:opacity-50"
                                        >
                                          Observar
                                        </button>
                                      )}
                                    </>
                                  )}
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: getDocStatusColor(doc.estatus) + '15', color: getDocStatusColor(doc.estatus) }}>
                                    {getDocStatusLabel(doc.estatus)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Observaciones Tab */}
          <TabsContent value="observaciones" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Card className="mb-4">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Emitir Nueva Observación</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateObservacion} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">Tipo</label>
                      <select
                        value={obsTipo}
                        onChange={(e) => setObsTipo(e.target.value)}
                        className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                      >
                        <option value="tecnica">Técnica</option>
                        <option value="administrativa">Administrativa</option>
                        <option value="financiera">Financiera</option>
                        <option value="documental">Documental</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">Severidad</label>
                      <select
                        value={obsSeveridad}
                        onChange={(e) => setObsSeveridad(e.target.value)}
                        className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                      >
                        <option value="baja">Baja</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                        <option value="critica">Critica</option>
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">Descripción</label>
                      <textarea
                        required
                        value={obsDescripcion}
                        onChange={(e) => setObsDescripcion(e.target.value)}
                        className="w-full h-20 px-3 py-2 text-xs border border-gray-200 rounded-md resize-none"
                        placeholder="Describa la observacion..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">Responsable</label>
                      <select
                        value={obsResponsable}
                        onChange={(e) => setObsResponsable(e.target.value)}
                        className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                      >
                        <option value="">{obra.contratista}</option>
                        <option value={obra.contratista}>{obra.contratista}</option>
                        <option value={obra.supervisor}>{obra.supervisor}</option>
                        <option value={`Municipio de ${obra.municipio}`}>Municipio de {obra.municipio}</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={obsSubmitting}
                        className="bg-brand-primary text-white px-4 py-2 rounded-md text-xs font-medium hover:bg-brand-primary-light transition-colors disabled:opacity-60"
                      >
                        {obsSubmitting ? 'Enviando...' : 'Emitir Observación'}
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {obraObservaciones.map((obs) => (
                  <Card key={obs.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-1 rounded-full flex-shrink-0 self-stretch" style={{ backgroundColor: getSeverityColor(obs.severidad) }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">{obs.tipo}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: getSeverityColor(obs.severidad) + '15', color: getSeverityColor(obs.severidad) }}>{getSeverityLabel(obs.severidad)}</span>
                            <span className="text-[10px] text-gray-400">{obs.fecha}</span>
                          </div>
                          <p className="text-xs text-gray-800 mt-1">{obs.descripcion}</p>
                          <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500 flex-wrap">
                            <span>Responsable: <span className="font-medium text-gray-700">{obs.responsable}</span></span>
                            <span className="px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: obs.estatus === 'abierta' ? '#DC262615' : obs.estatus === 'en_atencion' ? '#D69E2E15' : obs.estatus === 'atendida' ? '#38A16915' : '#A0AEC015', color: obs.estatus === 'abierta' ? '#DC2626' : obs.estatus === 'en_atencion' ? '#D69E2E' : obs.estatus === 'atendida' ? '#38A169' : '#A0AEC0' }}>
                              {obs.estatus === 'abierta' ? 'Abierta' : obs.estatus === 'en_atencion' ? 'En atención' : obs.estatus === 'atendida' ? 'Atendida' : 'Cerrada'}
                            </span>
                            {canManageObsEstatus && obs.estatus !== 'cerrada' && (
                              <select
                                value={obs.estatus}
                                disabled={obsStatusBusy}
                                onChange={(e) => handleObsEstatus(obs.id, e.target.value)}
                                className="text-[10px] border border-gray-200 rounded px-1 py-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="abierta">Abierta</option>
                                <option value="en_atencion">En atención</option>
                                <option value="atendida">Atendida</option>
                                <option value="cerrada">Cerrada</option>
                              </select>
                            )}
                          </div>
                          {canManageObs && obs.estatus === 'abierta' && (
                            <button
                              type="button"
                              onClick={() =>
                                updateObservacionEstatus(obs.id, 'en_atencion')
                                  .then(() => reload())
                                  .catch(() => setActionError('No se pudo actualizar estatus'))
                              }
                              className="mt-2 text-[10px] text-brand-primary-light hover:underline"
                            >
                              Marcar en atención
                            </button>
                          )}
                          {obs.respuestas.length > 0 && (
                            <div className="mt-3 pl-3 border-l-2 border-gray-200 space-y-2">
                              {obs.respuestas.map((r) => (
                                <div key={r.id} className="bg-gray-50 p-2 rounded-md">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-medium text-gray-700">{r.usuario}</span>
                                    <span className="text-[10px] text-gray-400">{r.fecha}</span>
                                  </div>
                                  <p className="text-[11px] text-gray-600">{r.descripcion}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {isConagua && obraId && (
            <TabsContent value="proagua" className="mt-4">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
                <CofinanciamientoTable obraId={obraId} />
                <AvanceTrimestralPanel
                  obraId={obraId}
                  ejercicioFiscal={parseEjercicioFromFolio(obra.folio)}
                />
              </motion.div>
            </TabsContent>
          )}
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

