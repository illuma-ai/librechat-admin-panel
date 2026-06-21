import type { ReactNode } from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from './cn';

/**
 * Collapsible accordion — a drop-in replacement for the click-ui `MultiAccordion`
 * compound (`MultiAccordion` + `MultiAccordion.Item` with id/value/title). Radix
 * `type="multiple"` open behaviour; token-only surfaces. Arbitrary `data-*`
 * attributes pass through to the underlying elements (used for scroll targeting).
 */
type DataAttrs = { [key: `data-${string}`]: string | boolean | undefined };

interface MultiAccordionProps extends DataAttrs {
  children: ReactNode;
  type?: 'multiple';
  defaultValue?: string[];
  showBorder?: boolean;
  /** Accepted for click-ui parity; the check indicator is not rendered. */
  showCheck?: boolean;
  fillWidth?: boolean;
  className?: string;
}

function MultiAccordionRoot({
  children,
  defaultValue,
  showBorder,
  // showCheck/type are accepted for click-ui parity; destructured out so they
  // are not spread onto the DOM element (Radix forwards unknown props).
  showCheck: _showCheck,
  type: _type,
  fillWidth,
  className,
  ...dataProps
}: MultiAccordionProps) {
  return (
    <AccordionPrimitive.Root
      type="multiple"
      defaultValue={defaultValue}
      className={cn(
        fillWidth && 'w-full',
        showBorder &&
          'divide-y divide-(--ui-color-stroke-default) overflow-hidden rounded-xl bg-(--ui-color-background-default)',
        className,
      )}
      {...dataProps}
    >
      {children}
    </AccordionPrimitive.Root>
  );
}

interface MultiAccordionItemProps extends DataAttrs {
  children: ReactNode;
  value: string;
  title: ReactNode;
  id?: string;
  className?: string;
}

function MultiAccordionItem({ children, value, title, id, className, ...dataProps }: MultiAccordionItemProps) {
  return (
    <AccordionPrimitive.Item value={value} id={id} className={className} {...dataProps}>
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="group flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-(--ui-color-text-default) outline-none hover:bg-(--ui-color-background-hover)">
          {title}
          <ChevronDown className="size-4 shrink-0 text-(--ui-color-text-muted) transition-transform group-data-[state=open]:rotate-180" />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-none">
        <div className="px-3 pt-1 pb-3">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}

export const MultiAccordion = Object.assign(MultiAccordionRoot, {
  Item: MultiAccordionItem,
});
