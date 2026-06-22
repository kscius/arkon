import { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { downloadProaguaExport } from '@/lib/api';
import { formatNumber, formatPercentage } from '@/lib/utils';
import { toast } from 'sonner';
import type { Obra } from '@/types';

interface FichaProaguaSectionProps {
  obra: Obra;
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

export function FichaProaguaSection({ obra, defaultOpen = false }: FichaProaguaSectionProps) {
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

  const hasCoberturas =
    obra.coberturaApAntes != null ||
    obra.coberturaApMeta != null ||
    obra.coberturaTarAntes != null ||
    obra.coberturaTarMeta != null;

  const hasBeneficiarios =
    obra.pobIncorporar != null ||
    obra.pobMejorar != null ||
    obra.pobMujeres != null ||
    obra.pobIndigena != null ||
    obra.pobAfromexicano != null;

  const fmtPct = (v: number | null | undefined) =>
    v != null ? formatPercentage(v) : '—';
  const fmtNum = (v: number | null | undefined) =>
    v != null ? formatNumber(v) : '—';

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50/80 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">
                Ficha PROAGUA (Anexo IX)
              </CardTitle>
              <div className="flex items-center gap-2">
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
              <p className="text-[10px] text-gray-500 mt-1">CUA: {obra.cua}</p>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
              <Field label="CUA" value={obra.cua ?? '—'} />
              <Field label="ID SISBA" value={obra.idSisba ?? '—'} />
              <Field label="Subcomponente" value={obra.subcomponente ?? '—'} />
              <Field label="Tipo localidad" value={obra.tipoLocalidad ?? '—'} />
              <Field label="Organismo operador" value={obra.organismoOperadorNombre ?? '—'} />
              <Field label="Entidad federativa" value={obra.entidadFederativaNombre ?? '—'} />
              <Field label="Accion programa" value={obra.accionProgramaClave ?? '—'} />
              <Field label="No. contrato" value={obra.numContrato ?? '—'} />
            </div>

            {hasCoberturas && (
              <div>
                <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Coberturas hidricas
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 p-3 bg-gray-50 rounded-lg">
                  <Field label="AP antes" value={fmtPct(obra.coberturaApAntes)} />
                  <Field label="AP meta" value={fmtPct(obra.coberturaApMeta)} />
                  <Field label="Alcantarillado antes" value={fmtPct(obra.coberturaTarAntes)} />
                  <Field label="Alcantarillado meta" value={fmtPct(obra.coberturaTarMeta)} />
                  {obra.caudalLps != null && (
                    <Field label="Caudal (L/s)" value={fmtNum(obra.caudalLps)} />
                  )}
                </div>
              </div>
            )}

            {hasBeneficiarios && (
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
            )}

            {!obra.cua && !hasCoberturas && !hasBeneficiarios && (
              <p className="text-xs text-gray-500 text-center py-2">
                Sin datos PROAGUA registrados para esta obra.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
