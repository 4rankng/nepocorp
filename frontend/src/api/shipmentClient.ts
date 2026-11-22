/**
 * Lô hàng (Shipment) API client — NEPO-61.
 * Transport: the shared `api` fetch singleton; endpoints from SHIPMENTS/TRIPS
 * in @tingting/shared. Documents upload as multipart (PDF/images stored as
 * uploaded, never re-encoded).
 */
import { api } from '../lib/api';
import { SHIPMENTS, TRIPS } from '@tingting/shared';
import type {
  CreateShipmentInput,
  LinkTripShipmentInput,
  LotCostRegister,
  RegisterShipmentDocumentInput,
  Shipment,
  ShipmentCost,
  ShipmentCostInput,
  ShipmentCostUpdateInput,
  ShipmentDetail,
  ShipmentDocument,
  ShipmentProfitSummary,
  UpdateShipmentInput,
} from '@tingting/shared';
import type { PaginatedResponse } from '@tingting/shared';

export interface ShipmentListParams {
  search?: string;
  customerId?: number;
  page?: number;
  pageSize?: number;
}

export const shipmentClient = {
  list: (params?: ShipmentListParams) =>
    api.get<PaginatedResponse<Shipment>>(`${SHIPMENTS.LIST}${toQuery(params as Record<string, unknown> | undefined)}`),
  detail: (id: number | string) =>
    api.get<ShipmentDetail>(SHIPMENTS.DETAIL(Number(id))),
  create: (data: CreateShipmentInput) =>
    api.post<Shipment>(SHIPMENTS.LIST, data),
  update: (id: number, data: UpdateShipmentInput) =>
    api.put<Shipment>(SHIPMENTS.DETAIL(id), data),
  /** Multipart chứng từ upload → created ShipmentDocument row. */
  uploadDocument: async (
    id: number,
    file: File,
    input: RegisterShipmentDocumentInput,
  ): Promise<ShipmentDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', input.docType);
    if (input.note) formData.append('note', input.note);
    return api.upload(SHIPMENTS.DOCUMENTS(id), formData) as Promise<ShipmentDocument>;
  },
  deleteDocument: (id: number, docId: number) =>
    api.delete(SHIPMENTS.DOCUMENT(id, docId)),
  /** XLSX/PDF bytes for one chứng từ (download via downloadBlob). */
  documentFile: (id: number, docId: number) =>
    api.getBlob(SHIPMENTS.DOCUMENT_FILE(id, docId)),
  addCost: (id: number, data: ShipmentCostInput) =>
    api.post<ShipmentCost>(SHIPMENTS.COSTS(id), data),
  updateCost: (id: number, costId: number, data: ShipmentCostUpdateInput) =>
    api.put<ShipmentCost>(SHIPMENTS.COST(id, costId), data),
  deleteCost: (id: number, costId: number) =>
    api.delete(SHIPMENTS.COST(id, costId)),
  costRegister: (id: number | string) =>
    api.get<LotCostRegister>(SHIPMENTS.COSTS_REGISTER(Number(id))),
  /** Gắn/gỡ chuyến vào lô (null gỡ). */
  linkTrip: (tripId: number, input: LinkTripShipmentInput) =>
    api.patch<unknown>(TRIPS.SHIPMENT(tripId), input),
};

/** Minimal query-string builder mirroring the other *Client.ts files. */
function toQuery(params?: ShipmentListParams): string {
  if (!params) return '';
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export type { ShipmentProfitSummary };
