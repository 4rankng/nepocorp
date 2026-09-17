import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import './TextField.css';
import './SelectField.css';

export interface SelectFieldProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  /** Shown in the trigger when no option is selected. Defaults to "— Chọn —". */
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
}

interface Option {
  value: string;
  label: string;
  disabled: boolean;
}

function optionText(children: React.ReactNode): string {
  return React.Children.toArray(children).map(child => {
    if (React.isValidElement<{ children?: React.ReactNode }>(child)) return optionText(child.props.children);
    return String(child);
  }).join('');
}

function collectOptions(children: React.ReactNode, groupDisabled = false): Option[] {
  return React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child)) return [];
    if (child.type === React.Fragment || child.type === 'optgroup') {
      return collectOptions(child.props.children, groupDisabled || !!child.props.disabled);
    }
    if (child.type !== 'option') return [];
    const text = optionText(child.props.children);
    return [{ value: String(child.props.value ?? text), label: child.props.label ?? text, disabled: groupDisabled || !!child.props.disabled }];
  });
}

function resolveValue(value: string | undefined, options: Option[]): string {
  return value !== undefined && options.some(option => option.value === value) ? value : (options.find(option => !option.disabled)?.value ?? '');
}

export function SelectField({
  label, required, error, helpText, children, className, value, defaultValue,
  onChange, disabled, placeholder, autoFocus, ...select
}: SelectFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const nativeRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initialValue = useRef(defaultValue === undefined ? undefined : String(defaultValue));
  const [uncontrolledValue, setUncontrolledValue] = useState(initialValue.current);
  const options = useMemo(() => collectOptions(children), [children]);
  const selectedValue = resolveValue(value === undefined ? uncontrolledValue : String(value), options);
  const selectedIndex = options.findIndex(option => option.value === selectedValue);
  const nativeList = select.multiple || (select.size !== undefined && select.size > 1);
  const describedBy = [select['aria-describedby'], error || helpText ? messageId : undefined].filter(Boolean).join(' ') || undefined;
  const cls = ['ds-field', error ? 'ds-field--error' : '', className].filter(Boolean).join(' ');

  useEffect(() => {
    if (nativeList) return;
    const native = nativeRef.current;
    const form = native?.form;
    if (!form || !native) return;
    const reset = (event: Event) => {
      const resetValue = value === undefined ? resolveValue(initialValue.current, options) : selectedValue;
      // The browser resets controls after firing this event. Restore the
      // wrapper's default (or controlled value) after that native action.
      queueMicrotask(() => {
        if (event.defaultPrevented) return;
        if (value === undefined) setUncontrolledValue(resetValue);
        native.value = resetValue;
      });
    };
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, [nativeList, options, selectedValue, value, select.form]);

  const changeSelection = (optionKey: string) => {
    const option = options[Number(optionKey)];
    const native = nativeRef.current;
    if (!native || !option || option.disabled || disabled) return;
    native.value = option.value;
    // Preserve a genuine select ChangeEvent (target/currentTarget, name,
    // selectedOptions), rather than manufacturing a partial event object.
    native.dispatchEvent(new Event('change', { bubbles: true }));
  };

  return (
    <div className={cls}>
      <label htmlFor={id} className="ds-field__label">
        {label}
        {required && <span className="ds-field__required" aria-hidden="true"> *</span>}
      </label>
      {nativeList ? (
        <select {...select} id={id} className="ds-field__input" value={value} defaultValue={defaultValue}
          onChange={onChange} disabled={disabled} required={required} autoFocus={autoFocus}
          aria-invalid={error ? true : select['aria-invalid']} aria-describedby={describedBy}>
          {children}
        </select>
      ) : (
        <>
          {/* Radix's unnamed internal select uses mapped values. Keep its
              synthetic change events out of the surrounding business form. */}
          <div onChange={event => event.stopPropagation()}>
            <Select value={selectedIndex < 0 ? '' : String(selectedIndex)} onValueChange={changeSelection} disabled={disabled}>
              <SelectTrigger ref={triggerRef} id={id} autoFocus={autoFocus} tabIndex={select.tabIndex}
                aria-required={required || undefined} aria-invalid={error ? true : select['aria-invalid']}
                aria-describedby={describedBy} aria-label={select['aria-label']} aria-labelledby={select['aria-labelledby']}>
                <SelectValue placeholder={placeholder ?? '— Chọn —'} />
              </SelectTrigger>
              <SelectContent collisionPadding={12}>
                {options.map((option, index) => (
                  <SelectItem key={index} value={String(index)} disabled={option.disabled}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <select {...select} ref={nativeRef} className="ds-select-native" aria-hidden="true" tabIndex={-1}
            value={selectedValue} disabled={disabled} required={required}
            onChange={event => {
              if (value === undefined) setUncontrolledValue(event.target.value);
              onChange?.(event);
            }}
            onInvalid={event => {
              select.onInvalid?.(event);
              event.preventDefault();
              triggerRef.current?.focus();
            }}>
            {children}
          </select>
        </>
      )}
      {error ? <span id={messageId} className="ds-field__msg ds-field__msg--error">{error}</span>
        : helpText ? <span id={messageId} className="ds-field__msg">{helpText}</span> : null}
    </div>
  );
}
