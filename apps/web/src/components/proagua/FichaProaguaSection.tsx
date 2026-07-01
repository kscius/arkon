import { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBrand } from '@/config/brand';
import { downloadProaguaExport } from '@/lib/api';
import { formatNumber, formatPercentage } from '@/lib/utils';
import { toast } from 'sonner';
import type { Accion } from '@/types';

interface FichaProaguaSectionProps {
  obra: Accion;
  defaultOpen?: boolean;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-xs font-medium text-gray-900">{value}</div>
    </div>
  );
}

const TIPO_ADJUDICACION_LABELS: Record<string, string> = {
  licitacion_publica: 'Licitacion publica',
  invitacion_restringida: 'Invitacion restringida',
  adjudicacion_directa: 'Adjudicacion directa',
};

export function FichaProaguaSection({ obra, defaultOpen = false }: FichaProaguaSectionProps) {
  const { entity } = getBrand();
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (kind: 'anexo-ix' | 'anexo-xiii' | 'anexo-xxiii', id: string) => {
    setExporting(kind);
    try {
      await downloadProaguaExport(kind, id);
      toast.success('Exportacion descargada');
    } catch {
      toast.error('No se pudo exportar el anexo');
    } finally {
      setExporting(null);
    }
  };

  const fmtPct = (v: number | null | undefined) =>
    v != null ? formatPercentage(v) : '—';
  const fmtNum = (v: number | null | undefined) =>
    v != null ? formatNumber(v) : '—';
  const fmtAdj = (v: string | null | undefined) =>
    v ? (TIPO_ADJUDICACION_LABELS[v] ?? v) : '—';

  const hasProaguaData = Boolean(
    obra.cua ||
      obra.idSisba ||
      obra.subcomponente ||
      obra.organismoOperadorNombre ||
      obra.entidadFederativaNombre,
  );

  return (
    <Collapsible defaultOpen={defaultOpen || !!obra.cua}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50/80 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold text-gray-900">
                Ficha PROAGUA (Anexo IX)
              </CardTitle>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px]"
                  disabled={!!exporting}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleExport('anexo-ix', obra.id);
                  }}
                >
                  <Download className="w-3 h-3 mr-1" />
                  {exporting === 'anexo-ix' ? '...' : 'IX'}
                </Button>
                {obra.anexoTecnicoId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px]"
                    disabled={!!exporting}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleExport('anexo-xiii', obra.anexoTecnicoId!);
                    }}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    {exporting === 'anexo-xiii' ? '...' : 'XIII'}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px]"
                  disabled={!!exporting}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleExport('anexo-xxiii', obra.id);
                  }}
                >
                  <Download className="w-3 h-3 mr-1" />
                  {exporting === 'anexo-xxiii' ? '...' : 'XXIII'}
                </Button>
                <ChevronDown className="w-4 h-4 text-gray-400 transition-transform [[data-state=open]_&]:rotate-180" />
              </div>
            </div>
            {obra.cua && (
              <p className="text-[10px] text-gray-500 mt-1">
                CUA: {obra.cua}
                {obra.idSisba ? ` · SISBA: ${obra.idSisba}` : ''}
                {obra.entidadFederativaNombre ? ` · ${obra.entidadFederativaNombre}` : ''}
              </p>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Identificadores federales
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
                <Field label="CUA" value={obra.cua ?? '—'} />
                <Field label="ID SISBA" value={obra.idSisba ?? '—'} />
                <Field label="No. contrato" value={obra.numContrato ?? '—'} />
                <Field label="Folio ComprasMX" value={obra.comprasMxFolio ?? '—'} />
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Catálogo y ejecutor
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
                <Field label="Programa" value={obra.programa} />
                <Field label="Subcomponente" value={obra.subcomponente ?? '—'} />
                <Field label="Tipo localidad" value={obra.tipoLocalidad ?? '—'} />
                <Field label="Accion programa" value={obra.accionProgramaClave ?? '—'} />
                <Field label="Entidad federativa" value={obra.entidadFederativaNombre ?? '—'} />
                <Field label="Organismo operador" value={obra.organismoOperadorNombre ?? '—'} />
                <Field label="Tipo adjudicacion" value={fmtAdj(obra.tipoAdjudicacion)} />
                <Field label="Fecha de fallo" value={obra.fechaFallo ?? '—'} />
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Coberturas hidricas
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-3 p-3 bg-gray-50 rounded-lg">
                <Field label="AP antes" value={fmtPct(obra.coberturaApAntes)} />
                <Field label="AP meta" value={fmtPct(obra.coberturaApMeta)} />
                <Field label="Alcantarillado antes" value={fmtPct(obra.coberturaTarAntes)} />
                <Field label="Alcantarillado meta" value={fmtPct(obra.coberturaTarMeta)} />
                <Field label="Caudal (L/s)" value={fmtNum(obra.caudalLps)} />
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Beneficiarios desagregados
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-3 p-3 bg-gray-50 rounded-lg">
                <Field label="Poblacion a incorporar" value={fmtNum(obra.pobIncorporar)} />
                <Field label="Poblacion a mejorar" value={fmtNum(obra.pobMejorar)} />
                <Field label="Mujeres" value={fmtNum(obra.pobMujeres)} />
                <Field label="Indigena" value={fmtNum(obra.pobIndigena)} />
                <Field label="Afromexicano" value={fmtNum(obra.pobAfromexicano)} />
              </div>
            </div>

            {!hasProaguaData && (
              <p className="text-xs text-gray-500 text-center py-2">
                Sin datos PROAGUA registrados para esta {entity.singular}.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
