import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { downloadDashboardSummaryExport, downloadAccionesExport } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { getBrand } from '@/config/brand';

interface DashboardExportActionsProps {
  className?: string;
}

export function DashboardExportActions({ className }: DashboardExportActionsProps) {
  const { entity } = getBrand();
  const [busy, setBusy] = useState<'csv' | 'summary' | null>(null);

  const handleObrasCsv = async () => {
    setBusy('csv');
    try {
      await downloadAccionesExport('csv');
      toast.success(`Listado de ${entity.plural} descargado`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : `No se pudo exportar ${entity.plural}`;
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleSummary = async () => {
    setBusy('summary');
    try {
      await downloadDashboardSummaryExport();
      toast.success('Resumen ejecutivo descargado');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo exportar el resumen';
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={busy !== null}
        onClick={() => void handleObrasCsv()}
      >
        <FileSpreadsheet className="w-4 h-4" />
        {busy === 'csv' ? 'Exportando…' : `${entity.pluralCap} (CSV)`}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={busy !== null}
        onClick={() => void handleSummary()}
      >
        <Download className="w-4 h-4" />
        {busy === 'summary' ? 'Exportando…' : 'Resumen KPIs'}
      </Button>
    </div>
  );
}
