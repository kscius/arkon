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
import { createAccion, fetchContratistas, fetchMunicipios, updateAccion, type CreateObraInput } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { getBrand } from '@/config/brand';
import { getProgramaName, getTipoAccionLabel } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganismoOperadorSelect } from '@/components/proagua/OrganismoOperadorSelect';
import type { Accion, User } from '@/types';

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
  cua: z.string().optional(),
  id_sisba: z.string().optional(),
  num_contrato: z.string().optional(),
  compras_mx_folio: z.string().optional(),
  tipo_adjudicacion: z.string().optional(),
  fecha_fallo: z.string().optional(),
  subcomponente: z.string().optional(),
  organismo_operador_id: z.string().optional(),
  tipo_localidad: z.string().optional(),
  cobertura_ap_antes: z.number().min(0).max(100).optional(),
  cobertura_ap_meta: z.number().min(0).max(100).optional(),
  cobertura_tar_antes: z.number().min(0).max(100).optional(),
  cobertura_tar_meta: z.number().min(0).max(100).optional(),
  caudal_lps: z.number().min(0).optional(),
  pob_incorporar: z.number().int().min(0).optional(),
  pob_mejorar: z.number().int().min(0).optional(),
  pob_mujeres: z.number().int().min(0).optional(),
  pob_indigena: z.number().int().min(0).optional(),
  pob_afromexicano: z.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

function toDateInputValue(value?: string): string {
  if (!value) return '';
  return value.slice(0, 10);
}

interface AccionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  accion?: Accion | null;
  onSuccess: () => void;
}

function resolveDependenciaOptions(catalog: string[], current?: string): string[] {
  if (!current || catalog.includes(current)) return catalog;
  return [current, ...catalog];
}

export function AccionFormModal({ open, onOpenChange, user, accion, onSuccess }: AccionFormModalProps) {
  const brand = getBrand();
  const { entity } = brand;
  const isConagua = brand.tenantId === 'conagua';
  const programas = brand.programas ?? DEFAULT_PROGRAMAS;
  const dependenciasCatalog = brand.dependencias ?? DEFAULT_DEPENDENCIAS;
  const defaultDependencia = dependenciasCatalog[0] ?? '';
  const isEdit = Boolean(accion);
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
      cua: '',
      id_sisba: '',
      num_contrato: '',
      compras_mx_folio: '',
      tipo_adjudicacion: '',
      fecha_fallo: '',
      subcomponente: '',
      organismo_operador_id: '',
      tipo_localidad: '',
      cobertura_ap_antes: undefined,
      cobertura_ap_meta: undefined,
      cobertura_tar_antes: undefined,
      cobertura_tar_meta: undefined,
      caudal_lps: undefined,
      pob_incorporar: undefined,
      pob_mejorar: undefined,
      pob_mujeres: undefined,
      pob_indigena: undefined,
      pob_afromexicano: undefined,
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
    if (accion) {
      form.reset({
        nombre: accion.nombre,
        localidad: accion.localidad,
        programa: accion.programa,
        dependencia: accion.dependencia,
        tipo_obra: (TIPOS_OBRA.includes(accion.tipoObra as (typeof TIPOS_OBRA)[number])
          ? accion.tipoObra
          : 'pavimentacion_urbana') as FormValues['tipo_obra'],
        monto_autorizado: accion.montoAutorizado,
        municipio_id: accion.municipioId ?? forcedMunicipioId ?? '',
        contratista_id: accion.contratistaId || '',
        estatus: (ESTATUS_OBRA.includes(accion.estatus as (typeof ESTATUS_OBRA)[number])
          ? accion.estatus
          : 'en_ejecucion_a_tiempo') as FormValues['estatus'],
        fecha_inicio: toDateInputValue(accion.fechaInicio),
        fecha_termino_programada: toDateInputValue(accion.fechaTerminoProgramada),
        plazo_ejecucion: accion.plazoEjecucion > 0 ? accion.plazoEjecucion : undefined,
        cua: accion.cua ?? '',
        id_sisba: accion.idSisba ?? '',
        num_contrato: accion.numContrato ?? '',
        compras_mx_folio: accion.comprasMxFolio ?? '',
        tipo_adjudicacion: accion.tipoAdjudicacion ?? '',
        fecha_fallo: toDateInputValue(accion.fechaFallo ?? undefined),
        subcomponente: accion.subcomponente ?? '',
        organismo_operador_id: accion.organismoOperadorId ?? '',
        tipo_localidad: accion.tipoLocalidad ?? '',
        cobertura_ap_antes: accion.coberturaApAntes ?? undefined,
        cobertura_ap_meta: accion.coberturaApMeta ?? undefined,
        cobertura_tar_antes: accion.coberturaTarAntes ?? undefined,
        cobertura_tar_meta: accion.coberturaTarMeta ?? undefined,
        caudal_lps: accion.caudalLps ?? undefined,
        pob_incorporar: accion.pobIncorporar ?? undefined,
        pob_mejorar: accion.pobMejorar ?? undefined,
        pob_mujeres: accion.pobMujeres ?? undefined,
        pob_indigena: accion.pobIndigena ?? undefined,
        pob_afromexicano: accion.pobAfromexicano ?? undefined,
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
        cua: '',
        subcomponente: '',
        organismo_operador_id: '',
        tipo_localidad: '',
        cobertura_ap_antes: undefined,
        cobertura_ap_meta: undefined,
        pob_incorporar: undefined,
        pob_mejorar: undefined,
      });
    }
  }, [open, accion, forcedMunicipioId, form, programas, defaultDependencia]);

  const dependenciaOptions = resolveDependenciaOptions(dependenciasCatalog, accion?.dependencia);

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

    if (isConagua) {
      if (values.cua?.trim()) payload.cua = values.cua.trim();
      if (values.id_sisba?.trim()) payload.id_sisba = values.id_sisba.trim();
      if (values.num_contrato?.trim()) payload.num_contrato = values.num_contrato.trim();
      if (values.compras_mx_folio?.trim()) payload.compras_mx_folio = values.compras_mx_folio.trim();
      if (values.tipo_adjudicacion?.trim()) payload.tipo_adjudicacion = values.tipo_adjudicacion.trim();
      if (values.fecha_fallo) payload.fecha_fallo = values.fecha_fallo;
      if (values.subcomponente?.trim()) payload.subcomponente = values.subcomponente.trim();
      if (values.organismo_operador_id) payload.organismo_operador_id = values.organismo_operador_id;
      if (values.tipo_localidad?.trim()) payload.tipo_localidad = values.tipo_localidad.trim();
      if (values.cobertura_ap_antes != null) payload.cobertura_ap_antes = values.cobertura_ap_antes;
      if (values.cobertura_ap_meta != null) payload.cobertura_ap_meta = values.cobertura_ap_meta;
      if (values.cobertura_tar_antes != null) payload.cobertura_tar_antes = values.cobertura_tar_antes;
      if (values.cobertura_tar_meta != null) payload.cobertura_tar_meta = values.cobertura_tar_meta;
      if (values.caudal_lps != null) payload.caudal_lps = values.caudal_lps;
      if (values.pob_incorporar != null) payload.pob_incorporar = values.pob_incorporar;
      if (values.pob_mejorar != null) payload.pob_mejorar = values.pob_mejorar;
      if (values.pob_mujeres != null) payload.pob_mujeres = values.pob_mujeres;
      if (values.pob_indigena != null) payload.pob_indigena = values.pob_indigena;
      if (values.pob_afromexicano != null) payload.pob_afromexicano = values.pob_afromexicano;
    }

    try {
      if (isEdit && accion) {
        await updateAccion(accion.id, payload);
        toast.success(`${entity.singularCap} actualizada`);
      } else {
        await createAccion(payload);
        toast.success(`${entity.singularCap} registrada`);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : `Error al guardar la ${entity.singular}`;
      toast.error(msg);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar ${entity.singular}` : `Nueva ${entity.singular}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {isConagua ? (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full h-auto flex">
                <TabsTrigger value="general" className="flex-1 text-xs data-[state=active]:bg-brand-primary data-[state=active]:text-white">
                  General
                </TabsTrigger>
                <TabsTrigger value="proagua" className="flex-1 text-xs data-[state=active]:bg-brand-primary data-[state=active]:text-white">
                  PROAGUA
                </TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="space-y-3 mt-3">
                <ObraGeneralFields
                  form={form}
                  isEdit={isEdit}
                  accion={accion}
                  programas={programas}
                  dependenciaOptions={dependenciaOptions}
                  isEstatal={isEstatal}
                  municipios={municipios}
                  contratistas={contratistas}
                  loadingCatalogs={loadingCatalogs}
                  showFieldError={showFieldError}
                  inputClass={inputClass}
                />
              </TabsContent>
              <TabsContent value="proagua" className="space-y-3 mt-3">
                <ProaguaFields
                  form={form}
                  municipioId={forcedMunicipioId ?? form.watch('municipio_id')}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <ObraGeneralFields
              form={form}
              isEdit={isEdit}
              accion={accion}
              programas={programas}
              dependenciaOptions={dependenciaOptions}
              isEstatal={isEstatal}
              municipios={municipios}
              contratistas={contratistas}
              loadingCatalogs={loadingCatalogs}
              showFieldError={showFieldError}
              inputClass={inputClass}
            />
          )}
          {form.formState.errors.root && (
            <p className="text-xs text-red-600">{form.formState.errors.root.message}</p>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : `Crear ${entity.singular}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProaguaFields({
  form,
  municipioId,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  municipioId?: string;
}) {
  const ooId = form.watch('organismo_operador_id');

  return (
    <>
      <Field label="CUA (Clave Unica de Accion)">
        <input {...form.register('cua')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white" placeholder="Ej. CUA-2026-001" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ID SISBA">
          <input {...form.register('id_sisba')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white" />
        </Field>
        <Field label="Subcomponente">
          <select {...form.register('subcomponente')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white">
            <option value="">Seleccionar...</option>
            <option value="nuevo">Nuevo (N)</option>
            <option value="rehabilitado">Rehabilitado (R)</option>
            <option value="mejoramiento">Mejoramiento (M)</option>
          </select>
        </Field>
      </div>
      <Field label="Tipo de localidad">
        <select {...form.register('tipo_localidad')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white">
          <option value="">Seleccionar...</option>
          <option value="urbana">Urbana</option>
          <option value="rural">Rural</option>
          <option value="indigena">Indigena</option>
        </select>
      </Field>
      <Field label="Organismo operador">
        <OrganismoOperadorSelect
          value={ooId}
          onValueChange={(v) => form.setValue('organismo_operador_id', v)}
          municipioId={municipioId}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cobertura AP antes (%)">
          <input
            type="number"
            min={0}
            max={100}
            {...form.register('cobertura_ap_antes', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
            })}
            className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
          />
        </Field>
        <Field label="Cobertura AP meta (%)">
          <input
            type="number"
            min={0}
            max={100}
            {...form.register('cobertura_ap_meta', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
            })}
            className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Poblacion a incorporar">
          <input
            type="number"
            min={0}
            {...form.register('pob_incorporar', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
            })}
            className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
          />
        </Field>
        <Field label="Poblacion a mejorar">
          <input
            type="number"
            min={0}
            {...form.register('pob_mejorar', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
            })}
            className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cobertura TAR antes (%)">
          <input
            type="number"
            min={0}
            max={100}
            {...form.register('cobertura_tar_antes', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
            })}
            className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
          />
        </Field>
        <Field label="Cobertura TAR meta (%)">
          <input
            type="number"
            min={0}
            max={100}
            {...form.register('cobertura_tar_meta', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
            })}
            className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
          />
        </Field>
      </div>
      <Field label="Caudal (L/s)">
        <input
          type="number"
          min={0}
          step="0.01"
          {...form.register('caudal_lps', {
            valueAsNumber: true,
            setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
          })}
          className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Mujeres">
          <input
            type="number"
            min={0}
            {...form.register('pob_mujeres', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
            })}
            className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
          />
        </Field>
        <Field label="Indigena">
          <input
            type="number"
            min={0}
            {...form.register('pob_indigena', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
            })}
            className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
          />
        </Field>
        <Field label="Afromexicano">
          <input
            type="number"
            min={0}
            {...form.register('pob_afromexicano', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
            })}
            className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white"
          />
        </Field>
      </div>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide pt-1">Contratacion (Anexo XVIII)</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="No. contrato">
          <input {...form.register('num_contrato')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white" />
        </Field>
        <Field label="Folio ComprasMX">
          <input {...form.register('compras_mx_folio')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo adjudicacion">
          <select {...form.register('tipo_adjudicacion')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white">
            <option value="">Seleccionar...</option>
            <option value="licitacion">Licitacion</option>
            <option value="invitacion">Invitacion</option>
            <option value="adjudicacion_directa">Adjudicacion directa</option>
          </select>
        </Field>
        <Field label="Fecha de fallo">
          <input type="date" {...form.register('fecha_fallo')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white" />
        </Field>
      </div>
    </>
  );
}

function ObraGeneralFields({
  form,
  isEdit,
  accion,
  programas,
  dependenciaOptions,
  isEstatal,
  municipios,
  contratistas,
  loadingCatalogs,
  showFieldError,
  inputClass,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  isEdit: boolean;
  accion?: Accion | null;
  programas: string[];
  dependenciaOptions: string[];
  isEstatal: boolean;
  municipios: { id: string; nombre: string }[];
  contratistas: { id: string; nombre: string }[];
  loadingCatalogs: boolean;
  showFieldError: (name: keyof FormValues) => string | undefined;
  inputClass: (name: keyof FormValues) => string;
}) {
  const { entity } = getBrand();

  return (
    <>
      {isEdit && accion ? (
        <Field label="Folio">
          <p className="h-9 px-2 flex items-center text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md">
            {accion.folio}
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
        <Field label={`Tipo de ${entity.singular} *`}>
          <select {...form.register('tipo_obra')} className="w-full h-9 px-2 text-xs border border-gray-200 rounded-md bg-white">
            {TIPOS_OBRA.map((t) => (
              <option key={t} value={t}>
                {getTipoAccionLabel(t)}
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
    </>
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
