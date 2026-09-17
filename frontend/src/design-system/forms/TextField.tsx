import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import './TextField.css';

export interface BaseFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  disabled?: boolean;
}

export interface TextFieldProps extends BaseFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className' | 'prefix'> {
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({
  label,
  required,
  error,
  helpText,
  prefix,
  suffix,
  className,
  ...input
}, ref) {
  const id = useId();
  const messageId = `${id}-message`;
  const describedBy = [input['aria-describedby'], error || helpText ? messageId : undefined].filter(Boolean).join(' ') || undefined;
  const cls = ['ds-field', error ? 'ds-field--error' : '', className].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <label htmlFor={id} className="ds-field__label">
        {label}
        {required && <span className="ds-field__required" aria-hidden="true"> *</span>}
      </label>
      {prefix || suffix ? (
        <div className="ds-field__input-group">
          {prefix && <span className="ds-field__affix">{prefix}</span>}
          <input ref={ref} id={id} className="ds-field__input" required={required} {...input} aria-invalid={error ? true : input['aria-invalid']} aria-describedby={describedBy} />
          {suffix && <span className="ds-field__affix">{suffix}</span>}
        </div>
      ) : (
        <input ref={ref} id={id} className="ds-field__input" required={required} {...input} aria-invalid={error ? true : input['aria-invalid']} aria-describedby={describedBy} />
      )}
      {error ? (
        <span id={messageId} className="ds-field__msg ds-field__msg--error">{error}</span>
      ) : helpText ? (
        <span id={messageId} className="ds-field__msg">{helpText}</span>
      ) : null}
    </div>
  );
});
