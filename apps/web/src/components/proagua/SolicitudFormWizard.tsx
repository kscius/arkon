import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getBrand } from '@/config/brand';
import {
  createSolicitud,
  fetchAccionesPrograma,
  fetchEntidadesFederativas,
  fetchMunicipios,
  presentarSolicitud,
} from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import type { User } from '@/types';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

const COMPONENTES = [
  { value: 'agua_potable', label: 'Agua potable (AP)' },
  { value: 'alcantarillado', label: 'Alcantarillado (ALC)' },
  { value: 'saneamiento', label: 'Saneamiento (SAN)' },
];

/** Wizard uses obra-style tipo; AccionPrograma catalog uses AP/alcantarillado/saneamiento. */
export function componenteToCatalogKey(componente: string): string {
  if (componente === 'agua_potable') return 'AP';
  return componente;
}

const STEPS = ['Programa', 'Componente', 'Acción VII', 'Monto y confirmación'];

function resolveTipoApoyo(programa: string): string {
  if (programa === 'PEAS') return 'fortalecimiento';
  return 'infraestructura';
}

interface SolicitudFormWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess: () => void;
}

export function SolicitudFormWizard({ open, onOpenChange, user, onSuccess }: SolicitudFormWizardProps) {
  const brand = getBrand();
  const programas = brand.programas ?? ['PROAGUA'];
  const currentYear = new Date().getFullYear();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [programa, setPrograma] = useState(programas[0] ?? 'PROAGUA');
  const [ejercicioFiscal, setEjercicioFiscal] = useState(currentYear);
  const [componente, setComponente] = useState(COMPONENTES[0].value);
  const [accionClave, setAccionClave] = useState('');
  const [montoSolicitado, setMontoSolicitado] = useState(1_000_000);
  const [entidadId, setEntidadId] = useState('');
  const [municipioId, setMunicipioId] = useState(user.municipioId ?? '');

  const [entidades, setEntidades] = useState<{ id: string; nombre: string }[]>([]);
  const [municipios, setMunicipios] = useState<{ id: string; nombre: string }[]>([]);
  const [acciones, setAcciones] = useState<{ id: string; label: string; componente: string }[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setPrograma(programas[0] ?? 'PROAGUA');
    setMunicipioId(user.municipioId ?? '');
    setLoadingCatalogs(true);
    Promise.all([fetchEntidadesFederativas(), fetchMunicipios()])
      .then(([ent, mun]) => {
        setEntidades(ent.map((e) => ({ id: e.id, nombre: e.nombre })));
        setMunicipios(mun.map((m) => ({ id: m.id, nombre: m.nombre })));
        if (ent.length > 0 && !entidadId) setEntidadId(ent[0].id);
        if (user.municipioId) setMunicipioId(user.municipioId);
      })
      .catch(() => toast.error('Error al cargar catálogos'))
      .finally(() => setLoadingCatalogs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user.municipioId]);

  useEffect(() => {
    if (!open || !programa) return;
    fetchAccionesPrograma(programa)
      .then((rows) => {
        const opts = rows.map((a) => ({
          id: a.clave,
          label: `${a.clave} — ${a.subcomponente}`,
          componente: a.componente,
        }));
        setAcciones(opts);
        if (opts.length > 0 && !accionClave) {
          setAccionClave(opts[0].id);
        }
      })
      .catch(() => setAcciones([]));
  }, [open, programa, accionClave]);

  const accionesFiltradas = useMemo(() => {
    const catalogKey = componenteToCatalogKey(componente);
    return acciones.filter(
      (a) =>
        a.componente === catalogKey ||
        a.componente === componente ||
        (catalogKey === 'AP' && a.componente.toUpperCase() === 'AP'),
    );
  }, [acciones, componente]);

  const selectedAccion = useMemo(
    () => accionesFiltradas.find((a) => a.id === accionClave) ?? accionesFiltradas[0],
    [accionesFiltradas, accionClave],
  );

  useEffect(() => {
    if (!open || accionesFiltradas.length === 0) return;
    if (!accionesFiltradas.some((a) => a.id === accionClave)) {
      setAccionClave(accionesFiltradas[0].id);
    }
  }, [open, accionesFiltradas, accionClave]);

  const canNext = () => {
    if (step === 0) return Boolean(programa && entidadId && municipioId);
    if (step === 1) return Boolean(componente);
    if (step === 2) return accionesFiltradas.length > 0;
    if (step === 3) return montoSolicitado > 0;
    return false;
  };

  const handleSubmit = async (presentar: boolean) => {
    if (!entidadId || !municipioId) {
      toast.error('Seleccione entidad y municipio');
      return;
    }
    setSubmitting(true);
    try {
      const solicitud = await createSolicitud({
        programa,
        ejercicio_fiscal: ejercicioFiscal,
        entidad_id: entidadId,
        municipio_id: municipioId,
        tipo_apoyo: resolveTipoApoyo(programa),
        componente,
        monto_solicitado: montoSolicitado,
        estatus: 'borrador',
      });
      if (presentar) {
        await presentarSolicitud(solicitud.id);
        toast.success('Solicitud presentada correctamente');
      } else {
        toast.success('Solicitud guardada como borrador');
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al guardar solicitud';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva solicitud (Anexo I)</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i < step
                    ? 'bg-green-600 text-white'
                    : i === step
                      ? 'bg-brand-primary text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className="text-[9px] text-gray-500 text-center hidden sm:block">{label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3 min-h-[200px]">
          {step === 0 && (
            <>
              <Field label="Programa">
                <select
                  value={programa}
                  onChange={(e) => setPrograma(e.target.value)}
                  className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                  disabled={loadingCatalogs}
                >
                  {programas.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ejercicio fiscal">
                <input
                  type="number"
                  value={ejercicioFiscal}
                  onChange={(e) => setEjercicioFiscal(Number(e.target.value))}
                  className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                />
              </Field>
              <Field label="Entidad federativa">
                <select
                  value={entidadId}
                  onChange={(e) => setEntidadId(e.target.value)}
                  className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                  disabled={loadingCatalogs}
                >
                  <option value="">Seleccionar...</option>
                  {entidades.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              {user.role === 'estatal' && (
                <Field label="Municipio">
                  <select
                    value={municipioId}
                    onChange={(e) => setMunicipioId(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                    disabled={loadingCatalogs}
                  >
                    <option value="">Seleccionar...</option>
                    {municipios.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                  {!municipioId && !loadingCatalogs && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      Seleccione el municipio ejecutor para continuar.
                    </p>
                  )}
                </Field>
              )}
              {user.role === 'municipal' && user.municipioId && (
                <Field label="Municipio">
                  <p className="text-xs font-medium text-gray-800 py-2 px-2 bg-gray-50 rounded-md border border-gray-200">
                    {municipios.find((m) => m.id === user.municipioId)?.nombre ??
                      'Municipio asignado a su cuenta'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Municipio preasignado según su perfil municipal.
                  </p>
                </Field>
              )}
            </>
          )}

          {step === 1 && (
            <Field label="Componente PROAGUA">
              <div className="space-y-2">
                {COMPONENTES.map((t) => (
                  <label
                    key={t.value}
                    className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer text-xs ${
                      componente === t.value
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="componente"
                      value={t.value}
                      checked={componente === t.value}
                      onChange={() => setComponente(t.value)}
                      className="accent-brand-primary"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                Tipo de apoyo: {resolveTipoApoyo(programa)} (segun programa)
              </p>
            </Field>
          )}

          {step === 2 && (
            <Field label="Acción específica (Anexo VII)">
              {accionesFiltradas.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No hay acciones del catálogo para {programa} / {componente}.
                </p>
              ) : (
                <select
                  value={accionClave}
                  onChange={(e) => setAccionClave(e.target.value)}
                  className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                >
                  {accionesFiltradas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              )}
              {selectedAccion && (
                <p className="text-[10px] text-gray-500 mt-1">Componente: {selectedAccion.componente}</p>
              )}
            </Field>
          )}

          {step === 3 && (
            <>
              <Field label="Monto solicitado (MXN)">
                <input
                  type="number"
                  min={1}
                  value={montoSolicitado}
                  onChange={(e) => setMontoSolicitado(Number(e.target.value))}
                  className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                />
              </Field>
              <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                <p>
                  <span className="text-gray-500">Programa:</span>{' '}
                  <span className="font-medium">{programa}</span>
                </p>
                <p>
                  <span className="text-gray-500">Tipo apoyo:</span>{' '}
                  <span className="font-medium">{resolveTipoApoyo(programa)}</span>
                </p>
                <p>
                  <span className="text-gray-500">Componente:</span>{' '}
                  <span className="font-medium">
                    {COMPONENTES.find((t) => t.value === componente)?.label ?? componente}
                  </span>
                </p>
                {selectedAccion && (
                  <p>
                    <span className="text-gray-500">Acción VII:</span>{' '}
                    <span className="font-medium">{selectedAccion.label}</span>
                  </p>
                )}
                <p>
                  <span className="text-gray-500">Monto:</span>{' '}
                  <span className="font-semibold text-brand-primary">
                    {formatCurrency(montoSolicitado)}
                  </span>
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2 flex-wrap">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
              >
                Guardar borrador
              </Button>
              <Button type="button" disabled={submitting} onClick={() => handleSubmit(true)}>
                {submitting ? 'Enviando...' : 'Presentar solicitud'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">{label}</label>
      {children}
    </div>
  );
}
