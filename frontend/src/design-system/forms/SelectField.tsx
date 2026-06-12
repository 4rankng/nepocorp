import { useId, type SelectHTMLAttributes, type ReactNode } from 'react';
import './TextField.css';

export interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: ReactNode;
  className?: string;
}

export function SelectField({
  label,
  required,
  error,
  helpText,
  children,
  className,
  ...select
}: SelectFieldProps) {
  const id = useId();
  const cls = ['ds-field', error ? 'ds-field--error' : '', className].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <label htmlFor={id} className="ds-field__label">
        {label}
        {required && <span className="ds-field__required" aria-hidden="true"> *</span>}
      </label>
      <select id={id} className="ds-field__input" {...select}>
        {children}
      </select>
      {error ? (
        <span className="ds-field__msg ds-field__msg--error">{error}</span>
      ) : helpText ? (
        <span className="ds-field__msg">{helpText}</span>
      ) : null}
    </div>
  );
}
