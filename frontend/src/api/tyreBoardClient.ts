import { api } from '../lib/api';
import { TYRE_BOARD } from '@tingting/shared';
import type { TyreBoard, TyreBoardSlotUpdateInput, TyreChangeRecord } from '@tingting/shared';

/**
 * NEPO-49 — Tyre board API client. GET endpoints mirror the sheet; the PUT is
 * the inline cell edit (subset patch, '' = clear, no history); the POST
 * /change is the "Thay lốp" flow (new serial + day → history row).
 */
export const tyreBoardClient = {
  get: (truckId: number) => api.get<TyreBoard>(TYRE_BOARD.GET(truckId)),

  changes: (truckId: number) => api.get<TyreChangeRecord[]>(TYRE_BOARD.CHANGES(truckId)),

  /** Inline cell edit on one slot — subset patch, writes no history row. */
  updateSlot: (truckId: number, position: number, patch: TyreBoardSlotUpdateInput) =>
    api.put<TyreBoardSlotUpdateInput & { position: number }>(TYRE_BOARD.SET_SERIAL(truckId, position), patch),

  /** "Thay lốp": new serial + day; records (ngày, seri cũ → mới) server-side. */
  changeTyre: (truckId: number, position: number, body: { newSerial: string; changedAt: string }) =>
    api.post<{ position: number; oldSerial: string | null; newSerial: string; changedAt: string }>(
      TYRE_BOARD.CHANGE(truckId, position),
      body,
    ),
};
