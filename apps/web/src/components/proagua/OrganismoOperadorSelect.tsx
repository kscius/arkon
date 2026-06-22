import { useEffect, useMemo, useState } from 'react';
import { ComboBox } from '@/components/ui/combobox';
import { fetchOrganismosOperadores } from '@/lib/api';
import { toast } from 'sonner';

interface OrganismoOperadorSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  municipioId?: string;
  entidadId?: string;
  disabled?: boolean;
  hasError?: boolean;
  message?: string;
  placeholder?: string;
}

export function OrganismoOperadorSelect({
  value = '',
  onValueChange,
  municipioId,
  entidadId,
  disabled = false,
  hasError = false,
  message,
  placeholder = 'Seleccionar organismo operador...',
}: OrganismoOperadorSelectProps) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOrganismosOperadores({
      municipio_id: municipioId,
      entidad_id: entidadId,
      search: searchTerm || undefined,
    })
      .then((rows) => {
        if (cancelled) return;
        setOptions(
          rows.map((oo) => ({
            value: oo.id,
            label: oo.siglas ? `${oo.nombre} (${oo.siglas})` : oo.nombre,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([]);
          toast.error('No se pudieron cargar organismos operadores');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [municipioId, entidadId, searchTerm]);

  const comboOptions = useMemo(() => options, [options]);

  return (
    <ComboBox
      options={comboOptions}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Cargando...' : placeholder}
      searchPlaceholder="Buscar OOO..."
      emptyState="No se encontraron organismos operadores."
      disabled={disabled || loading}
      hasError={hasError}
      message={message}
      useApiResults
      onSearch={setSearchTerm}
    />
  );
}
