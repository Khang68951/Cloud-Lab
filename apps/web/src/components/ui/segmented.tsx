import { RadioGroup } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

/** A row of mutually exclusive buttons (keyboard: arrow keys), e.g. Light / Dark / System. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onChange(v as T)}
      aria-label={ariaLabel}
      orientation="horizontal"
      className={cn('inline-flex flex-wrap gap-1 rounded-lg border bg-muted p-1', className)}
    >
      {options.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          className="inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-sm [&_svg]:size-4"
        >
          {o.icon}
          {o.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
