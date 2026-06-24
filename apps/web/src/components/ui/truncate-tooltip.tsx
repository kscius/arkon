import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type TruncateTooltipProps = {
  text: string;
  className?: string;
  maxWidthClass?: string;
};

/** Truncated text with hover/focus tooltip for full value. */
export function TruncateTooltip({
  text,
  className,
  maxWidthClass = 'max-w-[220px]',
}: TruncateTooltipProps) {
  if (!text) return <span className={className}>—</span>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('truncate block', maxWidthClass, className)} title={text}>
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
