import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { importProaguaObrasCsv, importProaguaObrasJson } from '@/lib/api';
import { toast } from 'sonner';
import type { ProaguaImportResult } from '@/types';

export default function ProaguaImportPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProaguaImportResult | null>(null);
  const [jsonText, setJsonText] = useState(
    '[\n  {\n    "cua": "CUA-EJEMPLO-001",\n    "nombre": "Obra importada de ejemplo",\n    "programa": "PROAGUA"\n  }\n]',
  );

  const handleCsv = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await importProaguaObrasCsv(file);
      setResult(res);
      toast.success(`Importacion: ${res.created} creadas, ${res.updated} actualizadas`);
    } catch {
      toast.error('Error al importar CSV');
    } finally {
      setBusy(false);
    }
  };

  const handleJson = async () => {
    setBusy(true);
    setResult(null);
    try {
      const parsed = JSON.parse(jsonText) as Record<string, unknown>[];
      if (!Array.isArray(parsed)) throw new Error('invalid');
      const res = await importProaguaObrasJson(parsed);
      setResult(res);
      toast.success(`Importacion: ${res.created} creadas, ${res.updated} actualizadas`);
    } catch {
      toast.error('JSON invalido o error de importacion');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-brand-primary flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importacion historica PROAGUA
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Carga masiva de obras por CUA desde CSV o JSON (upsert)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Archivo CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[10px] text-gray-500">
              Columnas: cua, folio, nombre, programa, monto_autorizado, municipio, localidad...
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              className="text-xs w-full"
              onChange={(e) => void handleCsv(e.target.files?.[0] ?? null)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">JSON (array de obras)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="w-full h-40 text-xs font-mono border rounded-md p-2"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              disabled={busy}
            />
            <Button size="sm" disabled={busy} onClick={() => void handleJson()}>
              Importar JSON
            </Button>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Resultado</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p>Total procesadas: {result.imported}</p>
            <p>Creadas: {result.created}</p>
            <p>Actualizadas: {result.updated}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
