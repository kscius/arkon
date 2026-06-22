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

const TIPOS_APOYO = [
  { value: 'agua_potable', label: 'Agua potable' },
  { value: 'alcantarillado', label: 'Alcantarillado' },
  { value: 'saneamiento', label: 'Saneamiento' },
  { value: 'tratamiento', label: 'Tratamiento' },
];

const STEPS = ['Programa', 'Tipo de apoyo', 'Componente', 'Monto y confirmacion'];

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
  const [tipoApoyo, setTipoApoyo] = useState(TIPOS_APOYO[0].value);
  const [componente, setComponente] = useState('');
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
      .catch(() => toast.error('Error al cargar catalogos'))
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
        if (opts.length > 0 && !componente) {
          setComponente(opts[0].componente);
        }
      })
      .catch(() => setAcciones([]));
  }, [open, programa, componente]);

  const selectedAccion = useMemo(
    () => acciones.find((a) => a.componente === componente),
    [acciones, componente],
  );

  const canNext = () => {
    if (step === 0) return Boolean(programa && entidadId && municipioId);
    if (step === 1) return Boolean(tipoApoyo);
    if (step === 2) return Boolean(componente);
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
        tipo_apoyo: tipoApoyo,
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
                </Field>
              )}
            </>
          )}

          {step === 1 && (
            <Field label="Tipo de apoyo">
              <div className="space-y-2">
                {TIPOS_APOYO.map((t) => (
                  <label
                    key={t.value}
                    className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer text-xs ${
                      tipoApoyo === t.value
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoApoyo"
                      value={t.value}
                      checked={tipoApoyo === t.value}
                      onChange={() => setTipoApoyo(t.value)}
                      className="accent-brand-primary"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </Field>
          )}

          {step === 2 && (
            <Field label="Componente / accion de programa">
              {acciones.length === 0 ? (
                <p className="text-xs text-gray-500">No hay acciones disponibles para {programa}.</p>
              ) : (
                <select
                  value={componente}
                  onChange={(e) => setComponente(e.target.value)}
                  className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
                >
                  {[...new Set(acciones.map((a) => a.componente))].map((comp) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
              )}
              {selectedAccion && (
                <p className="text-[10px] text-gray-500 mt-1">{selectedAccion.label}</p>
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
                  <span className="font-medium">
                    {TIPOS_APOYO.find((t) => t.value === tipoApoyo)?.label ?? tipoApoyo}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">Componente:</span>{' '}
                  <span className="font-medium">{componente}</span>
                </p>
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
