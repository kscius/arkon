import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/context/AppContext';
import type { PendienteItem } from '@/lib/api';
import {
  approveRecommendation,
  atenderAlerta,
  transitionSolicitud,
  updateAvanceTrimestral,
  updateDocumentoEstatus,
  updateObservacionEstatus,
  validateAvance,
  validateEstimacion,
} from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { getPendienteStripe, TIPO_META } from '@/lib/pendientes-meta';
import { formatDate } from '@/lib/utils';

const VERB_LABELS: Record<string, string> = {
  autorizar: 'Autorizar',
  validar: 'Validar',
  observar: 'Observar',
  atender: 'Atender',
  cerrar: 'Cerrar',
  aprobar: 'Aprobar',
  rechazar: 'Rechazar',
  revisar: 'Revisar',
};

const VERBS_REQUIRING_MOTIVO = new Set(['observar', 'rechazar']);

type PendingAction = {
  verbo: string;
  run: (motivo?: string) => Promise<void>;
};

export function PendienteRow({
  item,
  index,
  onResolve,
  onResolved,
}: {
  item: PendienteItem;
  index: number;
  onResolve: (enlace: string) => void;
  onResolved: () => void;
}) {
  const { user } = useApp();
  const Icon = TIPO_META[item.tipo].icon;
  const [busy, setBusy] = useState(false);
  const [motivoOpen, setMotivoOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [motivo, setMotivo] = useState('');

  const nivelEstimacion = user?.role === 'estatal' ? 'estatal' : 'municipal';

  const buildAction = (verbo: string): PendingAction | null => {
    if (verbo === 'revisar') {
      return {
        verbo,
        run: async () => onResolve(item.enlace),
      };
    }

    switch (item.tipo) {
      case 'estimacion':
        if (verbo === 'autorizar') {
          return {
            verbo,
            run: async () => {
              await validateEstimacion(item.id, 'estatal', true);
            },
          };
        }
        if (verbo === 'validar') {
          return {
            verbo,
            run: async () => {
              await validateEstimacion(item.id, nivelEstimacion, true);
            },
          };
        }
        if (verbo === 'observar') {
          return {
            verbo,
            run: async () => {
              await validateEstimacion(item.id, nivelEstimacion, false);
            },
          };
        }
        break;

      case 'documento':
        if (verbo === 'validar') {
          return {
            verbo,
            run: async () => {
              await updateDocumentoEstatus(item.id, 'validado');
            },
          };
        }
        if (verbo === 'observar') {
          return {
            verbo,
            run: async () => {
              await updateDocumentoEstatus(item.id, 'observado');
            },
          };
        }
        break;

      case 'observacion':
        if (verbo === 'atender') {
          return {
            verbo,
            run: async () => {
              await updateObservacionEstatus(item.id, 'atendida');
            },
          };
        }
        if (verbo === 'cerrar') {
          return {
            verbo,
            run: async () => {
              await updateObservacionEstatus(item.id, 'cerrada');
            },
          };
        }
        break;

      case 'alerta':
        if (verbo === 'atender') {
          return {
            verbo,
            run: async (texto) => {
              await atenderAlerta(item.id, texto ?? '');
            },
          };
        }
        break;

      case 'avance':
        if (verbo === 'validar') {
          return {
            verbo,
            run: async () => {
              await validateAvance(item.id, { validado: 1 });
            },
          };
        }
        if (verbo === 'observar') {
          return {
            verbo,
            run: async (texto) => {
              await validateAvance(item.id, { validado: 0, comentarios: texto });
            },
          };
        }
        break;

      case 'avance_trimestral': {
        const obraId = item.accionId;
        if (!obraId) return null;
        if (verbo === 'validar') {
          return {
            verbo,
            run: async () => {
              await updateAvanceTrimestral(obraId, item.id, { estatus: 'validado' });
            },
          };
        }
        if (verbo === 'observar') {
          return {
            verbo,
            run: async (texto) => {
              await updateAvanceTrimestral(obraId, item.id, {
                estatus: 'observado',
                observaciones: texto,
              });
            },
          };
        }
        break;
      }

      case 'recomendacion':
        if (verbo === 'aprobar') {
          return {
            verbo,
            run: async () => {
              await approveRecommendation(item.id);
            },
          };
        }
        break;

      case 'solicitud':
        if (verbo === 'aprobar') {
          return {
            verbo,
            run: async () => {
              await transitionSolicitud(item.id, 'aprobada');
            },
          };
        }
        if (verbo === 'rechazar') {
          return {
            verbo,
            run: async () => {
              await transitionSolicitud(item.id, 'rechazada');
            },
          };
        }
        break;

      default:
        break;
    }

    return null;
  };

  const executeAction = async (action: PendingAction, texto?: string) => {
    setBusy(true);
    try {
      await action.run(texto);
      toast.success(`${VERB_LABELS[action.verbo] ?? action.verbo} completado`);
      onResolved();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo completar la acción';
      toast.error(msg);
    } finally {
      setBusy(false);
      setMotivoOpen(false);
      setPendingAction(null);
      setMotivo('');
    }
  };

  const handleVerbClick = (verbo: string) => {
    if (verbo === 'revisar') {
      onResolve(item.enlace);
      return;
    }

    const action = buildAction(verbo);
    if (!action) return;

    const needsMotivo =
      VERBS_REQUIRING_MOTIVO.has(verbo) ||
      (verbo === 'atender' && item.tipo === 'alerta') ||
      (verbo === 'observar' && (item.tipo === 'avance' || item.tipo === 'avance_trimestral'));

    if (needsMotivo) {
      setPendingAction(action);
      setMotivoOpen(true);
      return;
    }

    void executeAction(action);
  };

  const handleMotivoConfirm = () => {
    if (!pendingAction) return;
    if (!motivo.trim()) {
      toast.error('Indique el motivo o comentario');
      return;
    }
    void executeAction(pendingAction, motivo.trim());
  };

  const getButtonVariant = (verbo: string): 'default' | 'destructive' | 'outline' | 'ghost' => {
    if (verbo === 'observar' || verbo === 'rechazar') return 'destructive';
    if (verbo === 'aprobar' || verbo === 'autorizar' || verbo === 'validar') return 'default';
    return 'outline';
  };

  const motivoTitle =
    pendingAction?.verbo === 'atender'
      ? 'Acción tomada'
      : pendingAction?.verbo === 'rechazar'
        ? 'Motivo del rechazo'
        : 'Motivo u observación';

  return (
    <>
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
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {item.accionesDisponibles.map((verbo) => (
            <Button
              key={verbo}
              size="sm"
              variant={getButtonVariant(verbo)}
              className="h-8 cursor-pointer px-2.5 text-xs"
              disabled={busy}
              onClick={() => handleVerbClick(verbo)}
            >
              {VERB_LABELS[verbo] ?? verbo}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="min-h-11 shrink-0 cursor-pointer gap-1 px-3 text-brand-primary hover:bg-brand-primary/10"
            disabled={busy}
            onClick={() => onResolve(item.enlace)}
          >
            Resolver
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.li>

      <Dialog open={motivoOpen} onOpenChange={(open) => !busy && setMotivoOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{motivoTitle}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Describa la acción o el motivo..."
            rows={4}
            disabled={busy}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={busy}
              onClick={() => {
                setMotivoOpen(false);
                setPendingAction(null);
                setMotivo('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="cursor-pointer"
              disabled={busy}
              onClick={handleMotivoConfirm}
            >
              {busy ? 'Procesando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
