import {
  VehicleComponent,
  VEHICLE_ALERT_LABELS,
  VehicleScheduleKind,
  VehicleScheduleStatus,
  type CreateVehicleScheduleInput,
  type UpdateVehicleScheduleInput,
  type VehicleAlertField,
  type VehicleAlertInput,
  type VehicleSchedule,
  type VehicleScheduleListQuery,
} from '@tingting/shared';
import { and, asc, eq, isNull, lte } from 'drizzle-orm';
import { db } from '../db';
import * as s from '../db/schema';
import { ApiError } from '../errors';
import type { Tx } from './trip-shared';

type DbLike = typeof db | Tx;
type VehicleLookupRow = { id: number; licensePlate: string };
type VehicleScheduleRowComponent = 'TRUCK' | 'TRAILER';
type VehicleScheduleRowKind = 'MAINTENANCE' | 'INSPECTION' | 'INSURANCE' | 'ROAD_FEE' | 'DOCUMENT' | 'OTHER';
type VehicleScheduleRowStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

function asVehicleComponent(value: VehicleScheduleRowComponent): VehicleComponent {
  return value as VehicleComponent;
}

function asVehicleScheduleKind(value: VehicleScheduleRowKind): VehicleScheduleKind {
  return value as VehicleScheduleKind;
}

function asVehicleScheduleStatus(
  value: VehicleScheduleRowStatus,
): VehicleScheduleStatus {
  return value as VehicleScheduleStatus;
}

export interface VehicleLookupDeps {
  findTruckById(id: number): Promise<VehicleLookupRow | null>;
  findTrailerById(id: number): Promise<VehicleLookupRow | null>;
}

export interface VehicleIdentity extends VehicleLookupRow {
  vehicleComponent: VehicleComponent;
}

export interface VehicleScheduleSourceRow {
  id: number;
  vehicleComponent: VehicleScheduleRowComponent;
  vehicleId: number;
  vehiclePlate: string;
  kind: VehicleScheduleRowKind;
  sourceKey?: string | null;
  vehicleDeletedAt?: Date | null;
  title: string;
  documentNumber: string | null;
  notes: string | null;
  dueAt: Date;
  remindAt: Date;
  status: VehicleScheduleRowStatus;
  completedAt: Date | null;
  completedBy: number | null;
  cancelledAt: Date | null;
  cancelledBy: number | null;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

const VEHICLE_ALERT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const LEGACY_TRUCK_SCHEDULE_SOURCE_KEY_PREFIX_BY_FIELD: Record<VehicleAlertField, string> = {
  nextInspectionDate: 'legacy-truck:nextinspectiondate:',
  insuranceExpiryDate: 'legacy-truck:insuranceexpirydate:',
  lastOilServiceDate: 'legacy-truck:lastoilservicedate:',
};
const NORMALIZED_OIL_ALERT_TITLE = normalizeText(VEHICLE_ALERT_LABELS.lastOilServiceDate);

function toDate(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, 'Thời gian không hợp lệ');
  }
  return parsed;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function assertRemindAtNotAfterDueAt(dueAt: Date, remindAt: Date): void {
  if (remindAt.getTime() > dueAt.getTime()) {
    throw new ApiError(400, 'Thời gian nhắc không được sau hạn xử lý');
  }
}

function fallbackVehiclePlate(component: VehicleScheduleRowComponent, vehicleId: number): string {
  return component === 'TRUCK'
    ? `Xe đầu kéo ${vehicleId}`
    : `Rơ moóc ${vehicleId}`;
}

export async function resolveVehicleIdentity(
  vehicleComponent: VehicleComponent,
  vehicleId: number,
  deps: VehicleLookupDeps,
): Promise<VehicleIdentity> {
  const row = vehicleComponent === VehicleComponent.TRUCK
    ? await deps.findTruckById(vehicleId)
    : await deps.findTrailerById(vehicleId);

  if (!row) {
    throw new ApiError(
      404,
      vehicleComponent === VehicleComponent.TRUCK
        ? 'Không tìm thấy xe đầu kéo'
        : 'Không tìm thấy rơ moóc',
    );
  }

  return {
    ...row,
    vehicleComponent,
  };
}

function createVehicleLookup(dbOrTx: DbLike): VehicleLookupDeps {
  return {
    findTruckById: async (id: number) => {
      const [truck] = await dbOrTx.select({
        id: s.trucks.id,
        licensePlate: s.trucks.licensePlate,
      }).from(s.trucks)
        .where(and(eq(s.trucks.id, id), isNull(s.trucks.deletedAt)))
        .limit(1);
      return truck ?? null;
    },
    findTrailerById: async (id: number) => {
      const [trailer] = await dbOrTx.select({
        id: s.trailers.id,
        licensePlate: s.trailers.licensePlate,
      }).from(s.trailers)
        .where(and(eq(s.trailers.id, id), isNull(s.trailers.deletedAt)))
        .limit(1);
      return trailer ?? null;
    },
  };
}

async function resolveVehiclePlateForExistingSchedule(
  dbOrTx: DbLike,
  vehicleComponent: VehicleComponent,
  vehicleId: number,
): Promise<string> {
  if (vehicleComponent === VehicleComponent.TRUCK) {
    const [truck] = await dbOrTx.select({
      licensePlate: s.trucks.licensePlate,
    }).from(s.trucks)
      .where(eq(s.trucks.id, vehicleId))
      .limit(1);
    return truck?.licensePlate ?? fallbackVehiclePlate(vehicleComponent, vehicleId);
  }

  const [trailer] = await dbOrTx.select({
    licensePlate: s.trailers.licensePlate,
  }).from(s.trailers)
    .where(eq(s.trailers.id, vehicleId))
    .limit(1);
  return trailer?.licensePlate ?? fallbackVehiclePlate(vehicleComponent, vehicleId);
}

function coerceVehiclePlate(row: {
  vehicleComponent: VehicleScheduleRowComponent;
  vehicleId: number;
  truckPlate: string | null;
  trailerPlate: string | null;
}): string {
  return row.vehicleComponent === 'TRUCK'
    ? (row.truckPlate ?? fallbackVehiclePlate(row.vehicleComponent, row.vehicleId))
    : (row.trailerPlate ?? fallbackVehiclePlate(row.vehicleComponent, row.vehicleId));
}

function compareActiveSchedules(a: VehicleSchedule, b: VehicleSchedule): number {
  if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
  const dueDiff = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  if (dueDiff !== 0) return dueDiff;
  return a.id - b.id;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeLegacyTruckScheduleSourceKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized === '' ? null : normalized;
}

function formatVietnamDateOnly(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VEHICLE_ALERT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) {
    throw new ApiError(500, 'Không thể quy đổi ngày lịch xe');
  }
  return `${year}-${month}-${day}`;
}

function resolveVehicleAlertFieldFromSchedule(
  row: Pick<VehicleScheduleSourceRow, 'kind' | 'sourceKey' | 'title'>,
): VehicleAlertField | null {
  const sourceKey = normalizeLegacyTruckScheduleSourceKey(row.sourceKey);
  for (const [field, expectedPrefix] of Object.entries(LEGACY_TRUCK_SCHEDULE_SOURCE_KEY_PREFIX_BY_FIELD) as Array<[VehicleAlertField, string]>) {
    if (sourceKey?.startsWith(expectedPrefix)) {
      return field;
    }
  }

  if (row.kind === VehicleScheduleKind.INSPECTION) return 'nextInspectionDate';
  if (row.kind === VehicleScheduleKind.INSURANCE) return 'insuranceExpiryDate';
  if (
    row.kind === VehicleScheduleKind.MAINTENANCE
    && normalizeText(row.title) === NORMALIZED_OIL_ALERT_TITLE
  ) {
    return 'lastOilServiceDate';
  }
  return null;
}

export function buildVehicleScheduleView(
  row: VehicleScheduleSourceRow,
  now: Date,
): VehicleSchedule {
  const isOverdue = row.status === VehicleScheduleStatus.ACTIVE
    && row.dueAt.getTime() < now.getTime();

  return {
    id: row.id,
    vehicleComponent: asVehicleComponent(row.vehicleComponent),
    vehicleId: row.vehicleId,
    vehiclePlate: row.vehiclePlate,
    kind: asVehicleScheduleKind(row.kind),
    title: row.title,
    documentNumber: row.documentNumber,
    notes: row.notes,
    dueAt: row.dueAt.toISOString(),
    remindAt: row.remindAt.toISOString(),
    status: asVehicleScheduleStatus(row.status),
    isOverdue,
    completedAt: row.completedAt?.toISOString() ?? null,
    completedBy: row.completedBy,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelledBy: row.cancelledBy,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

export function listActiveVehicleScheduleViews(
  rows: VehicleScheduleSourceRow[],
  now: Date,
): VehicleSchedule[] {
  return rows
    .filter((row) => (
      row.status === VehicleScheduleStatus.ACTIVE
      && row.remindAt.getTime() <= now.getTime()
    ))
    .map((row) => buildVehicleScheduleView(row, now))
    .sort(compareActiveSchedules);
}

export function buildVehicleAlertInputFromSchedules(
  rows: Array<Pick<VehicleScheduleSourceRow, 'kind' | 'sourceKey' | 'title' | 'dueAt' | 'remindAt' | 'status'>>,
  now: Date = new Date(),
): VehicleAlertInput {
  const earliestByField = new Map<VehicleAlertField, { dueAtMs: number; dueDate: string }>();
  const canonicalFields = new Set<VehicleAlertField>();

  for (const row of rows) {
    const field = resolveVehicleAlertFieldFromSchedule(row);
    if (!field) continue;
    canonicalFields.add(field);

    if (row.status !== VehicleScheduleStatus.ACTIVE) continue;
    if (row.remindAt.getTime() > now.getTime()) continue;

    const dueAtMs = row.dueAt.getTime();
    if (Number.isNaN(dueAtMs)) continue;

    const current = earliestByField.get(field);
    if (current && current.dueAtMs <= dueAtMs) continue;

    earliestByField.set(field, {
      dueAtMs,
      dueDate: formatVietnamDateOnly(row.dueAt),
    });
  }

  const input: VehicleAlertInput = {};
  for (const field of canonicalFields) {
    input[field] = null;
  }
  for (const [field, value] of earliestByField.entries()) {
    input[field] = value.dueDate;
  }
  return input;
}

async function resolveVehicleScheduleMutationFailure(dbOrTx: DbLike, id: number): Promise<never> {
  const [row] = await dbOrTx.select({
    id: s.vehicleSchedules.id,
    status: s.vehicleSchedules.status,
  }).from(s.vehicleSchedules)
    .where(eq(s.vehicleSchedules.id, id))
    .limit(1);

  if (!row) {
    throw new ApiError(404, 'Không tìm thấy lịch nhắc việc');
  }

  throw new ApiError(409, 'Lịch nhắc việc đã được xử lý, không thể chỉnh sửa');
}

function ensureMutableSchedule(status: VehicleSchedule['status']): void {
  if (status !== VehicleScheduleStatus.ACTIVE) {
    throw new ApiError(400, 'Lịch nhắc việc đã được xử lý, không thể chỉnh sửa');
  }
}

async function getVehicleScheduleRow(dbOrTx: DbLike, id: number) {
  const [row] = await dbOrTx.select().from(s.vehicleSchedules)
    .where(eq(s.vehicleSchedules.id, id))
    .limit(1);
  if (!row) {
    throw new ApiError(404, 'Không tìm thấy lịch nhắc việc');
  }
  return row;
}

async function mapVehicleScheduleRows(
  dbOrTx: DbLike,
  filters: VehicleScheduleListQuery,
  now: Date,
): Promise<VehicleScheduleSourceRow[]> {
  const conditions = [];

  if (filters.vehicleComponent) {
    conditions.push(eq(s.vehicleSchedules.vehicleComponent, filters.vehicleComponent));
  }
  if (filters.vehicleId) {
    conditions.push(eq(s.vehicleSchedules.vehicleId, filters.vehicleId));
  }

  if (!filters.history) {
    conditions.push(eq(s.vehicleSchedules.status, VehicleScheduleStatus.ACTIVE));
    conditions.push(lte(s.vehicleSchedules.remindAt, now));
  } else if (filters.status) {
    conditions.push(eq(s.vehicleSchedules.status, filters.status));
  }

  const rows = await dbOrTx.select({
    id: s.vehicleSchedules.id,
    vehicleComponent: s.vehicleSchedules.vehicleComponent,
    vehicleId: s.vehicleSchedules.vehicleId,
    kind: s.vehicleSchedules.kind,
    sourceKey: s.vehicleSchedules.sourceKey,
    truckDeletedAt: s.trucks.deletedAt,
    trailerDeletedAt: s.trailers.deletedAt,
    title: s.vehicleSchedules.title,
    documentNumber: s.vehicleSchedules.documentNumber,
    notes: s.vehicleSchedules.notes,
    dueAt: s.vehicleSchedules.dueAt,
    remindAt: s.vehicleSchedules.remindAt,
    status: s.vehicleSchedules.status,
    completedAt: s.vehicleSchedules.completedAt,
    completedBy: s.vehicleSchedules.completedBy,
    cancelledAt: s.vehicleSchedules.cancelledAt,
    cancelledBy: s.vehicleSchedules.cancelledBy,
    createdAt: s.vehicleSchedules.createdAt,
    createdBy: s.vehicleSchedules.createdBy,
    updatedAt: s.vehicleSchedules.updatedAt,
    updatedBy: s.vehicleSchedules.updatedBy,
    truckPlate: s.trucks.licensePlate,
    trailerPlate: s.trailers.licensePlate,
  }).from(s.vehicleSchedules)
    .leftJoin(
      s.trucks,
      and(
        eq(s.vehicleSchedules.vehicleId, s.trucks.id),
        eq(s.vehicleSchedules.vehicleComponent, VehicleComponent.TRUCK),
      ),
    )
    .leftJoin(
      s.trailers,
      and(
        eq(s.vehicleSchedules.vehicleId, s.trailers.id),
        eq(s.vehicleSchedules.vehicleComponent, VehicleComponent.TRAILER),
      ),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(s.vehicleSchedules.dueAt), asc(s.vehicleSchedules.id));

  return rows.map((row) => ({
    id: row.id,
    vehicleComponent: row.vehicleComponent,
    vehicleId: row.vehicleId,
    vehiclePlate: coerceVehiclePlate(row),
    kind: row.kind,
    sourceKey: row.sourceKey,
    vehicleDeletedAt: row.vehicleComponent === VehicleComponent.TRUCK ? row.truckDeletedAt : row.trailerDeletedAt,
    title: row.title,
    documentNumber: row.documentNumber,
    notes: row.notes,
    dueAt: row.dueAt,
    remindAt: row.remindAt,
    status: row.status,
    completedAt: row.completedAt,
    completedBy: row.completedBy,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  })).filter((row) => filters.history || row.vehicleDeletedAt == null);
}

export async function getTruckVehicleAlertInputFromSchedules(
  dbOrTx: DbLike,
  truckId: number,
  now: Date = new Date(),
): Promise<VehicleAlertInput> {
  const rows = await dbOrTx.select({
    kind: s.vehicleSchedules.kind,
    sourceKey: s.vehicleSchedules.sourceKey,
    title: s.vehicleSchedules.title,
    dueAt: s.vehicleSchedules.dueAt,
    remindAt: s.vehicleSchedules.remindAt,
    status: s.vehicleSchedules.status,
  }).from(s.vehicleSchedules)
    .where(and(
      eq(s.vehicleSchedules.vehicleComponent, VehicleComponent.TRUCK),
      eq(s.vehicleSchedules.vehicleId, truckId),
    ))
    .orderBy(asc(s.vehicleSchedules.dueAt), asc(s.vehicleSchedules.id));

  return buildVehicleAlertInputFromSchedules(rows, now);
}

export async function listVehicleSchedules(
  dbOrTx: DbLike,
  filters: VehicleScheduleListQuery,
  now = new Date(),
): Promise<VehicleSchedule[]> {
  const rows = await mapVehicleScheduleRows(dbOrTx, filters, now);
  if (!filters.history) {
    return listActiveVehicleScheduleViews(rows, now);
  }
  return rows.map((row) => buildVehicleScheduleView(row, now));
}

export function buildVehicleScheduleAuditKey(schedule: Pick<VehicleSchedule, 'vehiclePlate' | 'title'>): string {
  return `${schedule.vehiclePlate} - ${schedule.title}`;
}

export async function createVehicleSchedule(
  dbOrTx: DbLike,
  input: CreateVehicleScheduleInput,
  actorUserId: number,
): Promise<VehicleSchedule> {
  const dueAt = toDate(input.dueAt);
  const remindAt = toDate(input.remindAt);
  assertRemindAtNotAfterDueAt(dueAt, remindAt);
  const vehicle = await resolveVehicleIdentity(
    input.vehicleComponent,
    input.vehicleId,
    createVehicleLookup(dbOrTx),
  );

  const [created] = await dbOrTx.insert(s.vehicleSchedules).values({
    vehicleComponent: input.vehicleComponent,
    vehicleId: input.vehicleId,
    kind: input.kind,
    sourceKey: null,
    title: input.title.trim(),
    documentNumber: normalizeOptionalText(input.documentNumber),
    notes: normalizeOptionalText(input.notes),
    dueAt,
    remindAt,
    status: VehicleScheduleStatus.ACTIVE,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  }).returning();

  return buildVehicleScheduleView({
    ...created,
    vehiclePlate: vehicle.licensePlate,
  }, new Date());
}

export async function updateVehicleSchedule(
  dbOrTx: DbLike,
  id: number,
  input: UpdateVehicleScheduleInput,
  actorUserId: number,
): Promise<VehicleSchedule> {
  const existing = await getVehicleScheduleRow(dbOrTx, id);
  ensureMutableSchedule(asVehicleScheduleStatus(existing.status));

  const vehicleComponent = input.vehicleComponent ?? asVehicleComponent(existing.vehicleComponent);
  const vehicleId = input.vehicleId ?? existing.vehicleId;
  const dueAt = input.dueAt ? toDate(input.dueAt) : existing.dueAt;
  const remindAt = input.remindAt ? toDate(input.remindAt) : existing.remindAt;
  assertRemindAtNotAfterDueAt(dueAt, remindAt);
  const vehicleChanged = input.vehicleComponent !== undefined || input.vehicleId !== undefined;
  const vehiclePlate = vehicleChanged
    ? (await resolveVehicleIdentity(
      vehicleComponent,
      vehicleId,
      createVehicleLookup(dbOrTx),
    )).licensePlate
    : await resolveVehiclePlateForExistingSchedule(dbOrTx, vehicleComponent, vehicleId);

  const [updated] = await dbOrTx.update(s.vehicleSchedules).set({
    vehicleComponent,
    vehicleId,
    kind: input.kind ?? existing.kind,
    title: input.title?.trim() ?? existing.title,
    documentNumber: input.documentNumber !== undefined
      ? normalizeOptionalText(input.documentNumber)
      : existing.documentNumber,
    notes: input.notes !== undefined
      ? normalizeOptionalText(input.notes)
      : existing.notes,
    dueAt,
    remindAt,
    updatedBy: actorUserId,
    updatedAt: new Date(),
  }).where(and(
    eq(s.vehicleSchedules.id, id),
    eq(s.vehicleSchedules.status, VehicleScheduleStatus.ACTIVE),
  )).returning();

  if (!updated) {
    await resolveVehicleScheduleMutationFailure(dbOrTx, id);
  }

  return buildVehicleScheduleView({
    ...updated,
    vehiclePlate,
  }, new Date());
}

export async function completeVehicleSchedule(
  dbOrTx: DbLike,
  id: number,
  actorUserId: number,
): Promise<VehicleSchedule> {
  const existing = await getVehicleScheduleRow(dbOrTx, id);
  const vehiclePlate = await resolveVehiclePlateForExistingSchedule(
    dbOrTx,
    asVehicleComponent(existing.vehicleComponent),
    existing.vehicleId,
  );

  const now = new Date();
  const [updated] = await dbOrTx.update(s.vehicleSchedules).set({
    status: VehicleScheduleStatus.COMPLETED,
    completedAt: now,
    completedBy: actorUserId,
    cancelledAt: null,
    cancelledBy: null,
    updatedAt: now,
    updatedBy: actorUserId,
  }).where(and(
    eq(s.vehicleSchedules.id, id),
    eq(s.vehicleSchedules.status, VehicleScheduleStatus.ACTIVE),
  )).returning();

  if (!updated) {
    await resolveVehicleScheduleMutationFailure(dbOrTx, id);
  }

  return buildVehicleScheduleView({
    ...updated,
    vehiclePlate,
  }, now);
}

export async function cancelVehicleSchedule(
  dbOrTx: DbLike,
  id: number,
  actorUserId: number,
): Promise<VehicleSchedule> {
  const existing = await getVehicleScheduleRow(dbOrTx, id);
  const vehiclePlate = await resolveVehiclePlateForExistingSchedule(
    dbOrTx,
    asVehicleComponent(existing.vehicleComponent),
    existing.vehicleId,
  );

  const now = new Date();
  const [updated] = await dbOrTx.update(s.vehicleSchedules).set({
    status: VehicleScheduleStatus.CANCELLED,
    cancelledAt: now,
    cancelledBy: actorUserId,
    completedAt: null,
    completedBy: null,
    updatedAt: now,
    updatedBy: actorUserId,
  }).where(and(
    eq(s.vehicleSchedules.id, id),
    eq(s.vehicleSchedules.status, VehicleScheduleStatus.ACTIVE),
  )).returning();

  if (!updated) {
    await resolveVehicleScheduleMutationFailure(dbOrTx, id);
  }

  return buildVehicleScheduleView({
    ...updated,
    vehiclePlate,
  }, now);
}
