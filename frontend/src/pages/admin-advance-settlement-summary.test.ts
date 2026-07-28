import { describe, expect, it } from 'vitest';
import {
  groupSettlementExpensesByTrip,
  summarizeSettlementExpenses,
} from './admin-advance-settlement-summary';

describe('summarizeSettlementExpenses', () => {
  it('describes an empty settlement without inventing linked scope', () => {
    expect(summarizeSettlementExpenses(undefined)).toEqual({
      expenseCount: 0,
      tripCount: 0,
      containerCount: 0,
      label: '0 khoản chi · Chưa có phạm vi liên kết',
    });
  });

  it('counts expenses while deduplicating trips and normalized containers', () => {
    const summary = summarizeSettlementExpenses([
      { tripId: 101, containerNumber: ' FTAU1655851 ' },
      { tripId: 101, containerNumber: 'FTAU1655851' },
      { tripId: 102, containerNumber: 'DFSU7612721' },
      { tripId: 103, containerNumber: null },
    ]);

    expect(summary).toEqual({
      expenseCount: 4,
      tripCount: 3,
      containerCount: 2,
      label: '4 khoản chi · 3 chuyến · 2 container',
    });
  });

  it('does not count blank container labels as containers', () => {
    const summary = summarizeSettlementExpenses([
      { tripId: 201, containerNumber: '' },
      { tripId: 202, containerNumber: '   ' },
    ]);

    expect(summary.containerCount).toBe(0);
    expect(summary.label).toBe('2 khoản chi · 2 chuyến · 0 container');
  });
});

describe('groupSettlementExpensesByTrip', () => {
  it('keeps one transport-plan row per trip and rolls expense lines up horizontally', () => {
    const rows = groupSettlementExpensesByTrip([
      {
        tripId: 12,
        tripCode: 'PT-2607-0012',
        departureDate: '2026-07-28',
        customerName: 'Công ty Nitoda',
        routeName: 'Hải Phòng - Zaitoon',
        tripContainerCount: 2,
        containerNumber: 'FFAU3034060',
        expenseType: 'LIFTING',
        expenseTypeName: 'Nâng container',
        buyAmount: '1782000',
        invoiceNumber: '69137',
      },
      {
        tripId: 12,
        tripCode: 'PT-2607-0012',
        departureDate: '2026-07-28',
        customerName: 'Công ty Nitoda',
        routeName: 'Hải Phòng - Zaitoon',
        tripContainerCount: 2,
        containerNumber: 'CULU6174433',
        expenseType: 'LIFTING',
        expenseTypeName: 'Nâng container',
        buyAmount: 1650000,
        invoiceNumber: '123698',
      },
      {
        tripId: 12,
        tripCode: 'PT-2607-0012',
        departureDate: '2026-07-28',
        customerName: 'Công ty Nitoda',
        routeName: 'Hải Phòng - Zaitoon',
        tripContainerCount: 2,
        containerNumber: 'FFAU3034060',
        expenseType: 'CUSTOMS',
        expenseTypeName: 'Thủ tục HQ',
        buyAmount: 400000,
        invoiceNumber: null,
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tripId: 12,
      tripCode: 'PT-2607-0012',
      containerCount: 2,
      containerNumbers: ['CULU6174433', 'FFAU3034060'],
      totalExpense: 3832000,
    });
    expect(rows[0].expenseBreakdown).toEqual([
      {
        code: 'LIFTING',
        label: 'Nâng container',
        amount: 3432000,
        invoiceNumbers: ['123698', '69137'],
      },
      {
        code: 'CUSTOMS',
        label: 'Thủ tục HQ',
        amount: 400000,
        invoiceNumbers: [],
      },
    ]);
  });
});
