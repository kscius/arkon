import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Inbox,
  Search,
} from 'lucide-react';
import { PageState } from '@/components/PageState';
import { PendienteRow } from '@/components/PendienteRow';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchPendientes } from '@/lib/api';
import type { PendienteItem, PendienteTipo } from '@/lib/api';
import { SUMMARY_ORDER, TIPO_META } from '@/lib/pendientes-meta';
import { RecommendationsPanel } from '@/components/dashboard/RecommendationsPanel';

type TabValue = 'todas' | PendienteTipo;

const tabCountBadgeClass =
  'rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 group-data-[state=active]:bg-white group-data-[state=active]:text-brand-primary';

function filterItems(
  items: PendienteItem[],
  tab: TabValue,
  searchTerm: string,
): PendienteItem[] {
  const query = searchTerm.trim().toLowerCase();

  return items.filter((item) => {
    if (tab !== 'todas' && item.tipo !== tab) return false;
    if (!query) return true;

    const haystack = [item.accionFolio, item.accionNombre, item.municipio, item.titulo]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

function PendienteList({
  items,
  onResolve,
}: {
  items: PendienteItem[];
  onResolve: (enlace: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <p className="text-sm font-medium text-gray-700">Sin resultados</p>
        <p className="text-xs text-gray-500">
          No hay acciones que coincidan con los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {items.map((item, index) => (
        <PendienteRow key={`${item.tipo}-${item.id}`} item={item} index={index} onResolve={onResolve} />
      ))}
    </ul>
  );
}

export default function BandejaAccionesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const { data, loading, error, reload } = useAsyncData(fetchPendientes, []);

  const tabsWithItems = useMemo(() => {
    if (!data) return [];
    return SUMMARY_ORDER.filter(({ key }) => (data.totales[key] ?? 0) > 0);
  }, [data]);

  const tabValues = useMemo<TabValue[]>(
    () => ['todas', ...tabsWithItems.map(({ tipo }) => tipo)],
    [tabsWithItems],
  );

  useEffect(() => {
    if (activeTab !== 'todas' && !tabValues.includes(activeTab)) {
      setActiveTab('todas');
    }
  }, [activeTab, tabValues]);

  const handleResolve = (enlace: string) => navigate(enlace);

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      {data && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <Inbox className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-brand-primary">Bandeja de Acciones</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Todo lo que requiere tu atención sobre las obras registradas
                </p>
              </div>
            </div>
            {data.total > 0 && (
              <Badge className="w-fit bg-brand-primary text-white hover:bg-brand-primary">
                {data.total} pendiente{data.total === 1 ? '' : 's'}
              </Badge>
            )}
          </div>

          {data.total === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                <p className="text-base font-medium text-gray-700">Todo al día</p>
                <p className="max-w-sm text-sm text-gray-500">
                  No tienes acciones pendientes por resolver.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="relative max-w-md">
                <label htmlFor="bandeja-search" className="sr-only">
                  Buscar en la bandeja
                </label>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <Input
                  id="bandeja-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por folio, obra, municipio o título..."
                  className="h-10 pl-9 text-sm"
                />
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as TabValue)}
              >
                <TabsList className="flex h-auto flex-wrap gap-1 border border-gray-200 bg-white p-1">
                  <TabsTrigger
                    value="todas"
                    className="group gap-1.5 text-xs data-[state=active]:bg-brand-primary data-[state=active]:text-white"
                  >
                    Todas
                    <span className={tabCountBadgeClass}>
                      {data.total}
                    </span>
                  </TabsTrigger>
                  {tabsWithItems.map(({ key, tipo }) => {
                    const Icon = TIPO_META[tipo].icon;
                    const count = data.totales[key];
                    return (
                      <TabsTrigger
                        key={tipo}
                        value={tipo}
                        className="group gap-1.5 text-xs data-[state=active]:bg-brand-primary data-[state=active]:text-white"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {TIPO_META[tipo].label}
                        <span className={tabCountBadgeClass}>
                          {count}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {tabValues.map((tab) => (
                  <TabsContent key={tab} value={tab} className="mt-4">
                    <PendienteList
                      items={filterItems(data.items, tab, searchTerm)}
                      onResolve={handleResolve}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}

          <RecommendationsPanel />
        </div>
      )}
    </PageState>
  );
}
