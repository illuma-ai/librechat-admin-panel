import { forwardRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { Search, Eye, EyeOff } from 'lucide-react';
import { cn } from './cn';

/**
 * Text input primitives — drop-in replacements for the click-ui `TextField` /
 * `NumberField` / `TextAreaField` / `SearchField` (same value/onChange(value)
 * API). Every color comes from a `--cui-color-*` theme token (single source of
 * truth) — no hardcoded colors. `onChange` receives the raw string value, as
 * click-ui's controls do.
 */
const INPUT_CLASS =
  'h-8 w-full rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-2 text-sm text-(--cui-color-text-default) outline-none placeholder:text-(--cui-color-text-muted) focus-visible:border-(--cui-color-accent) disabled:cursor-not-allowed disabled:opacity-50';

interface FieldShellProps {
  id?: string;
  label?: string;
  error?: string;
  children: ReactNode;
}

/** Optional label above + error message below, wiring `htmlFor`/`aria` via id. */
function FieldShell({ id, label, error, children }: FieldShellProps) {
  if (!label && !error) return <>{children}</>;
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-(--cui-color-text-default)">
          {label}
        </label>
      ) : null}
      {children}
      {error ? <span className="text-xs text-(--cui-color-text-danger)">{error}</span> : null}
    </div>
  );
}

interface TextFieldProps {
  id?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export function TextField({
  id,
  type = 'text',
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  disabled,
  label,
  error,
  className,
  ...aria
}: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className={cn(INPUT_CLASS, error && 'border-(--cui-color-accent-danger)', className)}
        {...aria}
      />
    </FieldShell>
  );
}

interface NumberFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  'aria-label'?: string;
}

export function NumberField({
  id,
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  disabled,
  min,
  max,
  step,
  className,
  ...aria
}: NumberFieldProps) {
  return (
    <input
      id={id}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      className={cn(INPUT_CLASS, className)}
      {...aria}
    />
  );
}

interface TextAreaFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  'aria-label'?: string;
}

export function TextAreaField({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  rows = 3,
  className,
  ...aria
}: TextAreaFieldProps) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className={cn(
        INPUT_CLASS,
        'h-auto resize-y py-1.5 leading-relaxed',
        className,
      )}
      {...aria}
    />
  );
}

interface PasswordFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  /** Accessible labels for the reveal toggle (localized by the caller). */
  showLabel?: string;
  hideLabel?: string;
  'aria-label'?: string;
}

/** Password input with a built-in, accessibly-labelled reveal toggle. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { id, value, onChange, onKeyDown, placeholder, disabled, label, error, showLabel = 'Show password', hideLabel = 'Hide password', ...aria },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} error={error}>
      <div className="relative w-full">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          className={cn(INPUT_CLASS, 'pr-9', error && 'border-(--cui-color-accent-danger)')}
          {...aria}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-(--cui-color-text-muted) outline-none hover:text-(--cui-color-text-default) focus-visible:outline-2 focus-visible:outline-(--cui-color-outline)"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </FieldShell>
  );
});

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

export function SearchField({ value, onChange, placeholder, className, style, ...aria }: SearchFieldProps) {
  return (
    <div className={cn('relative w-full', className)} style={style}>
      <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-(--cui-color-text-muted)" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(INPUT_CLASS, 'pl-8')}
        {...aria}
      />
    </div>
  );
}
