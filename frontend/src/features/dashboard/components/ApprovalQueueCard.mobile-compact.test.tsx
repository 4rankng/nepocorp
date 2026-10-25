// NEPO-26 (issue 544) — mobile "Cần duyệt" quick-approve button and list rows
// were grossly oversized (45px bordered tick on its own row, 104px rows).
// Contract per spec:
// 1. every advances row keeps a quick-approve tick (40×40 ghost icon-button,
//    44px hit area) and tapping it approves without navigating;
// 2. rows stay single-line compact lists (64px, hairline dividers, 14/600
//    title, 12px sub, 16/600 tabular amount right, 16px chevron);
// 3. the count badge is a standard 20px chip;
// 4. row highlight is a light tint + 2px left accent, never a size change.
// DOM tests cover behavior; the CSS contract pins the geometry the DOM tests
// cannot see (jsdom has no container-query layout).
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApprovalQueueCard } from './ApprovalQueueCard';
import type { ApprovalQueueItem, ApprovalQueueResponse } from '../hooks/useApprovalQueue';

// Read straight from disk: Vitest stubs non-allowlisted ?raw css imports to ''
// (see vitest.config.ts css.include) and jsdom has no container-query layout.
// Vitest always runs with the frontend package as cwd (package.json scripts).
const dashboardCss = readFileSync(
  resolve(process.cwd(), 'src/pages/DashboardPage.css'),
  'utf8',
);

vi.mock('../../../api/forwarderClient', () => ({
  forwarderClient: { approveAdvanceRequest: vi.fn().mockResolvedValue(undefined) },
}));

import { forwarderClient } from '../../../api/forwarderClient';

const ITEM: ApprovalQueueItem = {
  id: 'advances:59',
  type: 'advances',
  title: 'Tạm ứng 20.000.000 ₫ — Tạm ứng nâng hạ',
  subtitle: 'Nguyễn Sĩ Quân · 19 ngày trước',
  amount: 20_000_000,
  requestedAt: '2026-10-05T04:38:34.760Z',
  href: '/advances?focus=59',
  severity: 'urgent',
};

const DATA: ApprovalQueueResponse = {
  total: 2,
  byType: {
    ancillaryFees: 0,
    debtOffsets: 0,
    advances: 1,
    advanceSettlementsCheck: 0,
    advanceSettlementsApprove: 1,
  },
  items: [
    ITEM,
    { ...ITEM, id: 'advanceSettlementsApprove:12', type: 'advanceSettlementsApprove', title: 'Phiếu thanh toán — duyệt', href: '/settlements/12' },
  ],
};

function renderCard(data = DATA) {
  const queryClient = new QueryClient();
  const navigate = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <ApprovalQueueCard data={data} loading={false} navigate={navigate} />
    </QueryClientProvider>,
  );
  return { navigate, queryClient };
}

afterEach(cleanup);

/** Body of the last CSS rule whose selector list contains `selector`
 *  (later rules win the cascade, so the last match is the effective one). */
function rule(css: string, selector: string): string {
  const bodies = [...css.matchAll(new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'g'))];
  return bodies.at(-1)?.[1] ?? '';
}

describe('ApprovalQueueCard quick approve (NEPO-26)', () => {
  it('renders one quick-approve tick per advances row only', () => {
    renderCard();
    expect(screen.getAllByRole('button', { name: 'Duyệt tạm ứng' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Duyệt phiếu thanh toán' })).toBeNull();
  });

  it('approves the advance in place without row navigation', async () => {
    const { navigate } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt tạm ứng' }));
    await waitFor(() => {
      expect(forwarderClient.approveAdvanceRequest).toHaveBeenCalledWith(59);
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('still opens the detail page when the row itself is tapped', () => {
    const { navigate } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: ITEM.title }));
    expect(navigate).toHaveBeenCalledWith('/advances?focus=59');
  });

  it('keeps the count chip and formatted amount', () => {
    renderCard();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getAllByText('20.000.000').length).toBeGreaterThan(0);
  });

  it('offers a compact title without the amount prefix, full title kept as tooltip', () => {
    renderCard();
    // compact variant (amount column already shows the figure)
    expect(screen.getByText('Tạm ứng nâng hạ')).toBeTruthy();
    // full variant stays in the DOM (desktop) and as the title tooltip
    expect(screen.getByText('Tạm ứng 20.000.000 ₫ — Tạm ứng nâng hạ')).toBeTruthy();
  });
});

describe('ApprovalQueueCard CSS contract (NEPO-26 geometry)', () => {
  it('tick button is a 40×40 ghost with a 44px hit area', () => {
    const quick = rule(dashboardCss, '\\.dash-wf \\.approval-queue__quick\\b');
    expect(quick).toMatch(/width:\s*40px/);
    expect(quick).toMatch(/height:\s*40px/);
    expect(quick).toMatch(/border:\s*0/);
    expect(quick).toMatch(/background:\s*transparent/);
    const hit = rule(dashboardCss, '\\.dash-wf \\.approval-queue__quick::after');
    expect(hit).toMatch(/inset:\s*-2px/);
  });

  it('tick hover/active states exist on the ghost variant', () => {
    expect(rule(dashboardCss, '\\.dash-wf \\.approval-queue__quick:hover')).toMatch(/var\(--wf-green-soft\)/);
    expect(rule(dashboardCss, '\\.dash-wf \\.approval-queue__quick:active')).toMatch(/var\(--wf-green\)/);
  });

  it('mobile rows are compact single-line 64px with hairline dividers', () => {
    const mobile = dashboardCss.slice(dashboardCss.indexOf('@container approval-queue'));
    expect(mobile).toMatch(/min-height:\s*64px/);
    expect(mobile).toMatch(/border-top:\s*1px solid var\(--wf-border\)/);
    expect(mobile).toMatch(/font-size:\s*14px/); // title
    expect(mobile).toMatch(/font-size:\s*12px/); // sub + ₫
    expect(mobile).toMatch(/font-size:\s*16px/); // amount
    expect(mobile).toMatch(/text-overflow:\s*ellipsis/);
  });

  it('count badge is a 20px chip and highlight never changes row size', () => {
    const count = rule(dashboardCss, '\\.dash-wf \\.approval-queue__count\\b');
    expect(count).toMatch(/height:\s*20px/);
    expect(count).toMatch(/line-height:\s*20px/);
    const hover = rule(dashboardCss, '\\.dash-wf \\.approval-queue__row:hover');
    expect(hover).toMatch(/#F9FAFB/);
    expect(hover).toMatch(/inset 2px 0 0 var\(--wf-green\)/);
    expect(hover).not.toMatch(/width|height|padding|margin/);
  });
});
