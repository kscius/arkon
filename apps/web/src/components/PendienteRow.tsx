import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PendienteItem } from '@/lib/api';
import { getPendienteStripe, TIPO_META } from '@/lib/pendientes-meta';
import { formatDate } from '@/lib/utils';

export function PendienteRow({
  item,
  index,
  onResolve,
}: {
  item: PendienteItem;
  index: number;
  onResolve: (enlace: string) => void;
}) {
  const Icon = TIPO_META[item.tipo].icon;

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-brand-surface/60"
    >
      <span className={`h-10 w-1 shrink-0 rounded-full ${getPendienteStripe(item)}`} />
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-primary/5 text-brand-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-gray-900">{item.titulo}</p>
          <Badge variant="outline" className="hidden shrink-0 text-[10px] sm:inline-flex">
            {TIPO_META[item.tipo].label}
          </Badge>
        </div>
        <p className="truncate text-xs text-gray-500">
          {[item.accionFolio, item.accionNombre ?? item.descripcion, item.municipio]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {item.fecha && (
        <span className="hidden shrink-0 text-xs text-gray-400 md:inline">
          {formatDate(item.fecha)}
        </span>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="min-h-11 shrink-0 gap-1 px-3 text-brand-primary hover:bg-brand-primary/10"
        onClick={() => onResolve(item.enlace)}
      >
        Resolver
        <ChevronRight className="h-4 w-4" />
      </Button>
    </motion.li>
  );
}
