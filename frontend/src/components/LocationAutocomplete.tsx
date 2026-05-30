import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchPlaceSuggestions, PlaceSuggestion } from '../lib/maps';
import { useClickOutside } from '../hooks/useClickOutside';

interface LocationAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  style,
  required,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeDropdown = useCallback(() => setIsOpen(false), []);

  useClickOutside(wrapperRef, closeDropdown);

  // Fetch suggestions with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (value.length >= 2) {
        setLoading(true);
        const results = await fetchPlaceSuggestions(value);
        // Only show suggestions if we have matches that aren't exactly the current value
        if (results.length > 0 && !(results.length === 1 && results[0].description === value)) {
          setSuggestions(results);
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
        setLoading(false);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  const handleSelect = (suggestion: PlaceSuggestion) => {
    onChange(suggestion.description);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        className={className}
        style={style}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        required={required}
        autoComplete="off"
      />
      
      {isOpen && suggestions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            padding: 0,
            margin: '4px 0 0 0',
            listStyle: 'none',
            background: 'var(--bg-1)',
            border: '1px solid var(--border-2)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((s) => (
            <li
              key={s.placeId}
              onClick={() => handleSelect(s)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 13,
                borderBottom: '1px solid var(--border-1)',
                color: 'var(--fg-1)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLLIElement).style.background = 'var(--bg-2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLLIElement).style.background = 'transparent';
              }}
            >
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
