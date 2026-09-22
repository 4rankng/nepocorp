import React, { useState, useEffect, useRef, useCallback, useMemo, useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPlaceSuggestions, PlaceSuggestion } from '../lib/maps';
import { useClickOutside } from '../hooks/useClickOutside';
import { configClient } from '../api/configClient';
import { qk } from '../api/keys';
import type { Port } from '@tingting/shared';

interface LocationAutocompleteProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
}

interface MergedSuggestion {
  key: string;
  description: string;
  source: 'port' | 'place';
  hint?: string;          // shown under description (e.g. port code, city)
}

export function LocationAutocomplete({
  id,
  value,
  onChange,
  placeholder,
  className,
  style,
  required,
}: LocationAutocompleteProps) {
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const [, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState(() => Math.random().toString(36).substring(2, 15));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dismissedRef = useRef(false);
  const activeOptionRef = useRef<HTMLLIElement>(null);
  const closeDropdown = useCallback(() => {
    dismissedRef.current = true;
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const [isFocused, setIsFocused] = useState(false);

  const refreshSessionToken = useCallback(() => {
    setSessionToken(Math.random().toString(36).substring(2, 15));
  }, []);

  useClickOutside(wrapperRef, closeDropdown, { escapeKey: true, enabled: isOpen });

  // Cached location suggestions; fires once per session for all autocomplete inputs.
  const { data: ports = [] } = useQuery<Port[]>({
    queryKey: qk.catalogs.portsCatalog,
    queryFn: () => configClient.getPorts(),
    staleTime: 5 * 60 * 1000,
  });

  // Local fuzzy match against the ports catalog. We always show matching ports
  // FIRST so HP-area users can pick the canonical name in one tap. Google Places
  // results follow underneath as the fallback for off-catalog locations.
  //
  // Behaviour:
  //   • Empty query → show top 8 ports (browse the whole catalog)
  //   • Query that matches at least 1 port → show matching ports (up to 6)
  //   • Query that matches no port → show nothing. The earlier code fell back
  //     to the top 8 catalog here, but that meant typing "Ha Noi" would keep
  //     showing the 8 Hải Phòng ports and never reach Google Places — see
  //     the bug report at /trips/new. Google Places results come in via the
  //     debounced fetch below; the user can also clear the field to browse
  //     the full port catalog.
  const portMatches = useMemo<MergedSuggestion[]>(() => {
    const q = value.trim().toLowerCase();
    const allAsSuggestions = (rows: Port[]) => rows.map((p) => ({
      key: `port-${p.id}`,
      description: p.name,
      source: 'port' as const,
      hint: [p.code, p.city].filter(Boolean).join(' · '),
    }));
    if (!q) {
      return allAsSuggestions(ports.slice(0, 8));
    }
    const matched = ports.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.code ?? '').toLowerCase().includes(q) ||
      (p.address ?? '').toLowerCase().includes(q)
    );
    return allAsSuggestions(matched.slice(0, 6));
  }, [ports, value]);

  // Fetch place suggestions with debounce (only for queries ≥2 chars)
  useEffect(() => {
    // Stale-response guard: a slow fetch for an earlier keystroke can resolve
    // after a newer one (layered caches make out-of-order resolution realistic)
    // and would show old results under the newer input.
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (value.trim().length >= 2) {
        setLoading(true);
        const results = await fetchPlaceSuggestions(value, sessionToken);
        if (cancelled) return;
        if (results.length > 0 && !(results.length === 1 && results[0].description === value)) {
          setPlaceSuggestions(results);
        } else {
          setPlaceSuggestions([]);
        }
        setLoading(false);
      } else {
        setPlaceSuggestions([]);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, sessionToken]);

  // Merge port matches + Google Places (deduping by description)
  const allSuggestions = useMemo<MergedSuggestion[]>(() => {
    const seen = new Set<string>();
    const out: MergedSuggestion[] = [];
    for (const p of portMatches) {
      const k = p.description.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(p);
      }
    }
    for (const s of placeSuggestions) {
      const k = s.description.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push({
          key: `place-${s.placeId}`,
          description: s.description,
          source: 'place',
        });
      }
    }
    return out;
  }, [portMatches, placeSuggestions]);

  // A selection or explicit dismissal stays closed even when a pending place
  // search resolves. Typing or focusing the field starts a new interaction.
  useEffect(() => {
    if (!isFocused || dismissedRef.current) return;
    setIsOpen(allSuggestions.length > 0);
  }, [allSuggestions, isFocused]);

  useEffect(() => {
    if (activeIndex >= allSuggestions.length) setActiveIndex(-1);
    if (isOpen) activeOptionRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, allSuggestions.length, isOpen]);

  const handleSelect = (suggestion: MergedSuggestion) => {
    closeDropdown();
    onChange(suggestion.description);
    setPlaceSuggestions([]);
    refreshSessionToken();
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        id={id}
        className={className}
        style={style}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          dismissedRef.current = false;
          setActiveIndex(-1);
          setPlaceSuggestions([]);
          onChange(e.target.value);
        }}
        onFocus={() => {
          dismissedRef.current = false;
          setIsFocused(true);
          // Show port catalog immediately on focus, even with empty input.
          if (allSuggestions.length > 0) setIsOpen(true);
        }}
        onBlur={() => {
          setIsFocused(false);
          closeDropdown();
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && allSuggestions.length > 0) {
            event.preventDefault();
            dismissedRef.current = false;
            setIsOpen(true);
            setActiveIndex(current => event.key === 'ArrowDown'
              ? Math.min(current + 1, allSuggestions.length - 1)
              : current < 0 ? allSuggestions.length - 1 : Math.max(0, current - 1));
          } else if (isOpen && (event.key === 'Enter' || event.key === 'Escape')) {
            event.preventDefault();
            event.stopPropagation();
            const suggestion = allSuggestions[activeIndex];
            if (event.key === 'Enter' && suggestion) handleSelect(suggestion);
            else closeDropdown();
          }
        }}
        role="combobox"
        aria-label={placeholder ?? 'Địa điểm'}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen && allSuggestions[activeIndex] ? `${listboxId}-${allSuggestions[activeIndex].key}` : undefined}
        required={required}
        autoComplete="off"
      />

      {isOpen && allSuggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={placeholder ?? 'Địa điểm'}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            padding: 0,
            margin: '4px 0 0 0',
            listStyle: 'none',
            background: 'var(--surface)',
            border: '1px solid var(--border-2, var(--line))',
            borderRadius: 'var(--radius-md, 10px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {allSuggestions.map((s, index) => (
            <li
              id={`${listboxId}-${s.key}`}
              key={s.key}
              ref={index === activeIndex ? activeOptionRef : undefined}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={event => event.preventDefault()}
              onClick={() => handleSelect(s)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 'var(--fs-control)',
                minHeight: 'var(--control-h)',
                background: index === activeIndex ? 'var(--bg-2, var(--surface-2))' : 'transparent',
                borderBottom: '1px solid var(--border-1, var(--line))',
                color: 'var(--fg-1, var(--ink))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ overflowWrap: 'anywhere' }}>
                  {s.description}
                </div>
                {s.hint && (
                  <div style={{ fontSize: 'var(--fs-caption)', lineHeight: 1.35, color: 'var(--fg-3, var(--ink-3))', marginTop: 1 }}>
                    {s.hint}
                  </div>
                )}
              </div>
              {s.source === 'port' && (
                <span
                  style={{
                    fontSize: 'var(--fs-caption)',
                    padding: '2px 6px',
                    borderRadius: 999,
                    background: 'rgba(16,185,129,0.15)',
                    color: '#059669',
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    flexShrink: 0,
                  }}
                >
                  CẢNG/BÃI
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
