import { api } from '../lib/api';
import { toQuery } from '../lib/http/query';
import { TRIPS } from '@tingting/shared';
import type {
  LedgerQueryInput,
  LedgerQueryResult,
  LedgerRow,
  Trip,
  TripExpense,
} from '@tingting/shared';

/** The money cell edit the grid saves through the existing expense endpoint. */
export interface LedgerExpensePatch {
  buyAmount?: number;
  sellAmount?: number;
}

export const ledgerClient = {
  getRows: (params: LedgerQueryInput) =>
    api.get<LedgerQueryResult>(`${TRIPS.LIST}/ledger${toQuery(params)}`),

  /** Authenticated download URL for "Xuất Excel" — pass through api.getBlob. */
  exportUrl: (params: LedgerQueryInput) =>
    `${TRIPS.LIST}/ledger/export${toQuery(params)}`,

  createDraft: (data: { customerId: number; departureDate: string; notes?: string }) =>
    api.post<Trip>(`${TRIPS.LIST}/ledger/drafts`, data),

  /** PLAN group — returns the fresh LedgerRow so the grid can repaint. */
  patchPlan: (id: number, data: Record<string, unknown> & { expectedVersion?: number }) =>
    api.patch<LedgerRow>(`${TRIPS.LIST}/ledger/${id}/plan`, data),

  /** MONEY group — returns the fresh LedgerRow so the grid can repaint. */
  patchMoney: (id: number, data: Record<string, unknown> & { expectedVersion?: number }) =>
    api.patch<LedgerRow>(`${TRIPS.LIST}/ledger/${id}/money`, data),

  /** Single-expense money cells route through the existing expense endpoint. */
  patchExpense: (tripId: number, expenseId: number, data: LedgerExpensePatch) =>
    api.put<TripExpense>(TRIPS.EXPENSE(tripId, expenseId), data),
};
