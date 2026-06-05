import { useState } from 'react';
import { getBrand } from '@/config/brand';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
  compact?: boolean;
  /** Logo only — no product name (sidebar / mobile drawer). */
  imageOnly?: boolean;
  /** Narrow sidebar icon strip. */
  collapsed?: boolean;
};

export function BrandLogo({
  className,
  iconClassName,
  showText = true,
  compact = false,
  imageOnly = false,
  collapsed = false,
}: BrandLogoProps) {
  const brand = getBrand();
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = brand.logoSrc && !logoFailed;
  const hideText = imageOnly || !showText;

  const logoFrameClass = cn(
    'bg-white rounded-md flex items-center justify-center overflow-hidden shrink-0',
    collapsed
      ? 'h-10 w-10 p-0'
      : imageOnly
        ? 'h-14 flex-1 min-w-0 w-full p-0'
        : compact
          ? 'h-8 px-1.5 py-0.5'
          : 'h-10 px-2 py-1',
    iconClassName,
  );

  const logoImageClass = cn(
    'object-contain object-center',
    collapsed || imageOnly
      ? 'h-full w-full min-h-full min-w-full scale-[1.12]'
      : compact
        ? 'h-full w-auto max-w-[120px]'
        : 'h-full w-auto max-w-[160px]',
  );

  return (
    <div
      className={cn(
        'flex items-center min-w-0',
        hideText ? 'w-full' : 'gap-2',
        className,
      )}
    >
      {showLogo ? (
        <div className={logoFrameClass}>
          <img
            src={brand.logoSrc!}
            alt={brand.logoAlt}
            onError={() => setLogoFailed(true)}
            className={logoImageClass}
          />
        </div>
      ) : (
        <Shield
          className={cn(
            'text-[var(--brand-accent)] shrink-0',
            collapsed ? 'w-6 h-6' : compact ? 'w-6 h-6' : 'w-7 h-7',
          )}
        />
      )}
      {!hideText && (
        <div className="min-w-0">
          <div className={cn('font-bold tracking-wide', compact ? 'text-sm' : 'text-sm')}>
            {brand.productShortName}
          </div>
          {!compact && (
            <div className="text-[10px] text-white/60 leading-tight truncate">
              {brand.institutionName}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
