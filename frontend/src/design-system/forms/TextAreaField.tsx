import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import type { BaseFieldProps } from './TextField';
import './TextField.css';

export interface TextAreaFieldProps
  extends BaseFieldProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> {
  className?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({
    label,
    required,
    error,
    helpText,
    className,
    ...textarea
  }, ref) {
    const id = useId();
    const fieldClassName = [
      'ds-field',
      error ? 'ds-field--error' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div className={fieldClassName}>
        <label htmlFor={id} className="ds-field__label">
          {label}
          {required && <span className="ds-field__required" aria-hidden="true"> *</span>}
        </label>
        <textarea
          ref={ref}
          id={id}
          className="ds-field__input"
          required={required}
          {...textarea}
          aria-invalid={error ? true : textarea['aria-invalid']}
        />
        {error ? (
          <span className="ds-field__msg ds-field__msg--error">{error}</span>
        ) : helpText ? (
          <span className="ds-field__msg">{helpText}</span>
        ) : null}
      </div>
    );
  },
);
