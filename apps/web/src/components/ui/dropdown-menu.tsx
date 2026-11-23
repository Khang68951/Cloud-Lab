import { Check } from 'lucide-react';
import { DropdownMenu as Primitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuRadioGroup = Primitive.RadioGroup;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-40 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Primitive.Label>) {
  return <Primitive.Label className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', className)} {...props} />;
}

export function DropdownMenuRadioItem({ className, children, ...props }: ComponentProps<typeof Primitive.RadioItem>) {
  return (
    <Primitive.RadioItem
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none data-[highlighted]:bg-muted [&_svg]:size-4',
        className,
      )}
      {...props}
    >
      {children}
      <Primitive.ItemIndicator className="absolute right-2 inline-flex">
        <Check />
      </Primitive.ItemIndicator>
    </Primitive.RadioItem>
  );
}
