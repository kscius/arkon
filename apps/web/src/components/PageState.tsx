import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

interface PageStateProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: ReactNode;
}

export function PageState({ loading, error, onRetry, children }: PageStateProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
        <Spinner className="size-8 text-brand-primary" />
        <p className="text-sm">Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-sm text-red-600 text-center max-w-md">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
