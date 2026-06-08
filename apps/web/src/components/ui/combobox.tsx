import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ComboBoxOption {
  value: string;
  label: string;
}

export interface ComboBoxProps {
  options: ComboBoxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyState?: string;
  disabled?: boolean;
  hasError?: boolean;
  message?: string;
  className?: string;
  triggerClassName?: string;
  /** When true, parent filters options via onSearch instead of local filter */
  useApiResults?: boolean;
  onSearch?: (term: string) => void;
}

export function ComboBox({
  options,
  value = '',
  onValueChange,
  placeholder = 'Selecciona una opción...',
  searchPlaceholder = 'Buscar...',
  emptyState = 'No se encontraron resultados.',
  disabled = false,
  hasError = false,
  message,
  className,
  triggerClassName,
  useApiResults = false,
  onSearch,
}: ComboBoxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedLabel = React.useMemo(
    () => options.find((o) => o.value === value)?.label ?? placeholder,
    [options, value, placeholder],
  );

  const filteredOptions = React.useMemo(() => {
    if (useApiResults && search) return options;
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, search, useApiResults]);

  const handleSearchChange = (term: string) => {
    setSearch(term);
    onSearch?.(term);
  };

  const handleSelect = (selected: string) => {
    onValueChange?.(selected);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={cn('relative w-full min-w-0', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'h-9 w-full justify-between px-3 font-normal text-xs',
              hasError && 'border-destructive',
              triggerClassName,
            )}
          >
            <span className="truncate text-left" title={selectedLabel}>
              {selectedLabel}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={handleSearchChange}
              className="text-xs"
            />
            <CommandList>
              <CommandEmpty className="text-xs py-4">{emptyState}</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        'mr-2 size-4 shrink-0',
                        value === option.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate" title={option.label}>
                      {option.label}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {message ? (
        <p
          className={cn(
            'mt-1 truncate text-[10px]',
            hasError ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
