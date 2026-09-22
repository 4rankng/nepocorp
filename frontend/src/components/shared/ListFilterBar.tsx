import { Search, X } from 'lucide-react';
import { useRef } from 'react';
import './ListFilterBar.css';

interface FilterOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface ListFilterBarProps<T extends string> {
  label: string;
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  search?: {
    value: string;
    onChange: (value: string) => void;
    label: string;
    placeholder?: string;
  };
}

/** A single filter row on the page canvas. Long option sets scroll in place;
 * the search field keeps its own full-width row on small screens. */
export function ListFilterBar<T extends string>({ label, options, value, onChange, search }: ListFilterBarProps<T>) {
  const searchRef = useRef<HTMLInputElement>(null);
  return (
    <div className="list-filter-bar">
      <div className="list-filter-options" role="group" aria-label={label}>
        {options.map(option => (
          <button
            type="button"
            key={option.value}
            className="list-filter-option"
            aria-label={option.count === undefined ? option.label : `${option.label} ${option.count}`}
            aria-pressed={value === option.value}
            onClick={event => {
              onChange(option.value);
              event.currentTarget.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
            }}
          >
            {option.label}
            {option.count !== undefined && <span className="list-filter-count">{` ${option.count}`}</span>}
          </button>
        ))}
      </div>
      {search && (
        <div className="list-filter-search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            aria-label={search.label}
            placeholder={search.placeholder ?? search.label}
            value={search.value}
            onChange={event => search.onChange(event.target.value)}
          />
          {search.value && (
            <button type="button" aria-label="Xóa tìm kiếm" onClick={() => { search.onChange(''); searchRef.current?.focus(); }}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
