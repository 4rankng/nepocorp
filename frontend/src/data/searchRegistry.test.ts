import { createElement } from 'react';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ASSET_ICON_NAMES, AssetIcon, type AssetIconName } from '../components/AssetIcon';
import { CONFIG_ITEMS, getSearchItems } from './searchRegistry';

const PUBLIC_DIR = join(process.cwd(), 'public');

const DISTINCT_CONFIG_ICONS = {
  'company-info': 'company-profile',
  'road-allowances': 'road-allowance',
  'trip-expense': 'trip-expense-rules',
  'cap-table': 'equity-ownership',
  routes: 'route-distance',
  'tire-positions': 'tire',
  trailers: 'trailer',
  'pricing-tables': 'pricing-rate',
  'salary-periods': 'salary-period',
  'expense-categories': 'expense-category',
  'forwarder-expense-types': 'forwarder-expense',
  'debit-note-templates': 'debit-note-template',
  'llm-settings': 'ai-provider',
  'faq-entries': 'faq',
  'app-settings': 'app-settings',
} as const;

describe('config card icon assignments', () => {
  it('keeps the audited config concepts visually distinct', () => {
    const iconById = new Map(CONFIG_ITEMS.map(item => [item.id, item.iconName]));

    for (const [id, iconName] of Object.entries(DISTINCT_CONFIG_ICONS)) {
      expect(iconById.get(id)).toBe(iconName);
    }

    expect(new Set(Object.values(DISTINCT_CONFIG_ICONS)).size).toBe(
      Object.keys(DISTINCT_CONFIG_ICONS).length,
    );
  });

  it('resolves every distinct concept to a different branded asset', () => {
    const assetUrls = Object.values(DISTINCT_CONFIG_ICONS).map(iconName => {
      const { container, unmount } = render(
        createElement(AssetIcon, { name: iconName as AssetIconName }),
      );
      const src = container.querySelector('img')?.getAttribute('src');
      unmount();
      return src;
    });

    expect(assetUrls.every(src => src?.endsWith('.png'))).toBe(true);
    expect(new Set(assetUrls).size).toBe(assetUrls.length);
  });
});

describe('admin search icon assignments', () => {
  it('uses the dedicated financial and audit concepts', () => {
    const iconById = new Map(getSearchItems('ADMIN').map(item => [item.id, item.iconName]));

    expect(iconById.get('profit')).toBe('profit');
    expect(iconById.get('payables')).toBe('payables');
    expect(iconById.get('advances')).toBe('advances');
    expect(iconById.get('audit-logs')).toBe('audit-log');
    expect(iconById.get('action-audit-logs')).toBe('audit-log');
  });
});

describe('asset icon registry', () => {
  it('points every registered name to a unique public PNG file', () => {
    const assetUrls = ASSET_ICON_NAMES.map(name => {
      const { container, unmount } = render(createElement(AssetIcon, { name }));
      const src = container.querySelector('img')?.getAttribute('src');
      unmount();
      return src;
    });

    expect(new Set(assetUrls).size).toBe(ASSET_ICON_NAMES.length);
    for (const src of assetUrls) {
      expect(src).toMatch(/^\/assets\/icons\/.+\.png$/);
      expect(existsSync(join(PUBLIC_DIR, src!.slice(1)))).toBe(true);
    }
  });
});
