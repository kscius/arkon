import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createObra, fetchContratistas, fetchMunicipios, updateObra, type CreateObraInput } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { getBrand } from '@/config/brand';
import { getProgramaName, getTipoObraLabel } from '@/lib/utils';
import type { Obra, User } from '@/types';

const DEFAULT_PROGRAMAS = ['FAPAA', 'CAM', 'FAIS', 'FORTAMUN', 'FOMAGUA', 'FOISE', 'PEF', 'SISPLADE'];

const DEFAULT_DEPENDENCIAS = [
  'Comision de Agua Potable',
  'Proteccion Civil Estatal',
  'Secretaria de Cultura',
  'Secretaria de Cultura y Deporte',
  'Secretaria de Desarrollo Social',
  'Secretaria de Educacion',
  'Secretaria de Energia',
  'Secretaria de Infraestructura',
  'Secretaria de Salud',
  'Secretaria del Medio Ambiente',
];

const TIPOS_OBRA = [
  'pavimentacion_urbana',
  'infraestructura_educativa',
  'drenaje_saneamiento',
  'electrificacion',
  'agua_potable',
  'espacios_publicos',
  'salud',
  'proteccion_civil',
  'infraestructura_comercial',
  'patrimonio_cultural',
  'puentes_vialidades',
  'caminos_rurales',
  'alumbrado_publico',
] as const;

const ESTATUS_OBRA = [
  'en_ejecucion_a_tiempo',
  'en_ejecucion_retraso',
  'en_preparacion',
  'en_riesgo',
  'concluida',
] as const;

const schema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  localidad: z.string().min(1, 'Localidad requerida'),
  programa: z.string().min(1),
  dependencia: z.string().min(1, 'Dependencia requerida'),
  tipo_obra: z.enum(TIPOS_OBRA),
  monto_autorizado: z.number().positive('Monto debe ser mayor a 0'),
  municipio_id: z.string().min(1, 'Municipio requerido'),
  contratista_id: z.string().optional(),
  estatus: z.enum(ESTATUS_OBRA).optional(),
  fecha_inicio: z.string().optional(),
  fecha_termino_programada: z.string().optional(),
  plazo_ejecucion: z.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

function toDateInputValue(value?: string): string {
  if (!value) return '';
  return value.slice(0, 10);
}

interface ObraFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  obra?: Obra | null;
  onSuccess: () => void;
}

function resolveDependenciaOptions(catalog: string[], current?: string): string[] {
  if (!current || catalog.includes(current)) return catalog;
  return [current, ...catalog];
}

export function ObraFormModal({ open, onOpenChange, user, obra, onSuccess }: ObraFormModalProps) {
  const brand = getBrand();
  const programas = brand.programas ?? DEFAULT_PROGRAMAS;
  const dependenciasCatalog = brand.dependencias ?? DEFAULT_DEPENDENCIAS;
  const defaultDependencia = dependenciasCatalog[0] ?? '';
  const isEdit = Boolean(obra);
  const isEstatal = user.role === 'estatal';
  const forcedMunicipioId = user.role === 'municipal' ? user.municipioId : undefined;

  const [municipios, setMunicipios] = useState<{ id: string; nombre: string }[]>([]);
  const [contratistas, setContratistas] = useState<{ id: string; nombre: string }[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '',
      localidad: '',
      programa: programas[0],
      dependencia: defaultDependencia,
      tipo_obra: 'pavimentacion_urbana',
      monto_autorizado: 1_000_000,
      municipio_id: forcedMunicipioId ?? '',
      contratista_id: '',
      estatus: 'en_preparacion',
      fecha_inicio: '',
      fecha_termino_programada: '',
      plazo_ejecucion: undefined,
    },
  });

  useEffect(() => {
    if (!open) return;
    setLoadingCatalogs(true);
    Promise.all([fetchMunicipios(), fetchContratistas()])
      .then(([mun, con]) => {
        setMunicipios(mun.map((m) => ({ id: m.id, nombre: m.nombre })));
        setContratistas(con.map((c) => ({ id: c.id, nombre: c.nombre })));
      })
      .catch(() => toast.error('No se pudieron cargar catálogos'))
      .finally(() => setLoadingCatalogs(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (obra) {
      form.reset({
        nombre: obra.nombre,
        localidad: obra.localidad,
        programa: obra.programa,
        dependencia: obra.dependencia,
        tipo_obra: (TIPOS_OBRA.includes(obra.tipoObra as (typeof TIPOS_OBRA)[number])
          ? obra.tipoObra
          : 'pavimentacion_urbana') as FormValues['tipo_obra'],
        monto_autorizado: obra.montoAutorizado,
        municipio_id: obra.municipioId ?? forcedMunicipioId ?? '',
        contratista_id: obra.contratistaId || '',
        estatus: (ESTATUS_OBRA.includes(obra.estatus as (typeof ESTATUS_OBRA)[number])
          ? obra.estatus
          : 'en_ejecucion_a_tiempo') as FormValues['estatus'],
        fecha_inicio: toDateInputValue(obra.fechaInicio),
        fecha_termino_programada: toDateInputValue(obra.fechaTerminoProgramada),
        plazo_ejecucion: obra.plazoEjecucion > 0 ? obra.plazoEjecucion : undefined,
      });
    } else {
      form.reset({
        nombre: '',
        localidad: '',
        programa: programas[0],
        dependencia: defaultDependencia,
        tipo_obra: 'pavimentacion_urbana',
        monto_autorizado: 1_000_000,
        municipio_id: forcedMunicipioId ?? '',
        contratista_id: '',
        estatus: 'en_preparacion',
        fecha_inicio: '',
        fecha_termino_programada: '',
        plazo_ejecucion: undefined,
      });
    }
  }, [open, obra, forcedMunicipioId, form, programas, defaultDependencia]);

  const dependenciaOptions = resolveDependenciaOptions(dependenciasCatalog, obra?.dependencia);

  const showFieldError = (name: keyof FormValues): string | undefined => {
    const err = form.formState.errors[name];
    if (!err?.message) return undefined;
    if (form.formState.isSubmitted || form.formState.touchedFields[name]) {
      return String(err.message);
    }
    return undefined;
  };

  const inputClass = (name: keyof FormValues) =>
    cn(
      'w-full h-9 px-2 text-xs border rounded-md bg-white',
      showFieldError(name) ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-200',
    );

  const onSubmit = form.handleSubmit(async (values) => {
    const municipioId = forcedMunicipioId ?? values.municipio_id;
    const payload: CreateObraInput = {
      nombre: values.nombre.trim(),
      localidad: values.localidad.trim(),
      programa: values.programa,
      tipo_programa: 'estatal',
      dependencia: values.dependencia.trim(),
      tipo_obra: values.tipo_obra,
      monto_autorizado: values.monto_autorizado,
      municipio_id: municipioId,
      contratista_id: values.contratista_id || undefined,
      estatus: values.estatus,
      fecha_inicio: values.fecha_inicio || undefined,
      fecha_termino_programada: values.fecha_termino_programada || undefined,
      plazo_ejecucion: values.plazo_ejecucion,
      avance_fisico_programado: 0,
      avance_fisico_real: 0,
      avance_financiero: 0,
    };

    try {
      if (isEdit && obra) {
        await updateObra(obra.id, payload);
        toast.success('Obra actualizada');
      } else {
        await createObra(payload);
        toast.success('Obra registrada');
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al guardar la obra';
      toast.error(msg);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar obra' : 'Nueva obra'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {isEdit && obra ? (
            <Field label="Folio">
              <p className="h-9 px-2 flex items-center text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md">
                {obra.folio}
              </p>
            </Field>
          ) : (
            <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5">
              El folio se generará automáticamente al guardar (formato PROGRAMA-AÑO-###).
            </p>
          )}
          <Field label="Programa *">
            <select {...form.register('programa')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white">
              {programas.map((p) => (
                <option key={p} value={p}>
                  {getProgramaName(p)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nombre *">
            <input {...form.register('nombre')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Localidad *">
              <input {...form.register('localidad')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white" />
            </Field>
            <Field label="Dependencia *">
              <select {...form.register('dependencia')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white">
                {dependenciaOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de obra *">
              <select {...form.register('tipo_obra')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white">
                {TIPOS_OBRA.map((t) => (
                  <option key={t} value={t}>
                    {getTipoObraLabel(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estatus">
              <select {...form.register('estatus')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white">
                {ESTATUS_OBRA.map((e) => (
                  <option key={e} value={e}>
                    {e.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Monto autorizado (MXN) *">
            <input type="number" {...form.register('monto_autorizado', { valueAsNumber: true })} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de inicio">
              <input type="date" {...form.register('fecha_inicio')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white" />
            </Field>
            <Field label="Fecha término programada">
              <input type="date" {...form.register('fecha_termino_programada')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white" />
            </Field>
          </div>
          <Field label="Plazo de ejecución (meses)" required error={showFieldError('plazo_ejecucion')}>
            <input
              type="number"
              min={1}
              {...form.register('plazo_ejecucion', {
                valueAsNumber: true,
                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
              })}
              className={inputClass('plazo_ejecucion')}
              placeholder="Ej. 12"
            />
          </Field>
          {isEstatal && (
            <Field label="Municipio" required error={showFieldError('municipio_id')}>
              <select
                {...form.register('municipio_id')}
                className={inputClass('municipio_id')}
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
          <Field label="Contratista (opcional)">
            <select {...form.register('contratista_id')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white" disabled={loadingCatalogs}>
              <option value="">Sin asignar</option>
              {contratistas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Field>
          {form.formState.errors.root && (
            <p className="text-xs text-red-600">{form.formState.errors.root.message}</p>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear obra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        className={cn(
          'text-[10px] uppercase font-medium block mb-1',
          error ? 'text-red-600' : 'text-gray-500',
        )}
      >
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {error ? <p className="text-[10px] text-red-600 mt-0.5">{error}</p> : null}
    </div>
  );
}
