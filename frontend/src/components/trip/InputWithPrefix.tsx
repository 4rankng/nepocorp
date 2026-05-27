import React from 'react';

interface InputWithPrefixProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix: string;
  mono?: boolean;
  type?: string;
}

export function InputWithPrefix({ value, onChange, placeholder, prefix, mono, type }: InputWithPrefixProps) {
  return (
    <div className="tc-input-prefix">
      <input
        className={`input${mono ? ' mono' : ''}`}
        type={type ?? 'text'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="tc-prefix-label">{prefix}</span>
    </div>
  );
}
