import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VehicleComponent,
  VehicleScheduleKind,
  VehicleScheduleStatus,
} from '@tingting/shared';
import {
  buildVehicleAlertInputFromSchedules,
  buildVehicleScheduleView,
  listActiveVehicleScheduleViews,
  resolveVehicleIdentity,
  type VehicleScheduleSourceRow,
} from '../services/vehicle-schedule.service';

describe('vehicle schedule service helpers', () => {
  test('buildVehicleScheduleView classifies overdue status on the exact UTC instant across the Vietnam day boundary', () => {
    const row: VehicleScheduleSourceRow = {
      id: 15,
      vehicleComponent: VehicleComponent.TRUCK,
      vehicleId: 7,
      vehiclePlate: '15C-123.45',
      kind: VehicleScheduleKind.INSPECTION,
      title: 'Đăng kiểm',
      documentNumber: null,
      notes: null,
      dueAt: new Date('2026-07-28T17:00:00.000Z'),
      remindAt: new Date('2026-07-28T01:30:00.000Z'),
      status: VehicleScheduleStatus.ACTIVE,
      completedAt: null,
      completedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      createdAt: new Date('2026-07-20T00:00:00.000Z'),
      createdBy: 1,
      updatedAt: new Date('2026-07-20T00:00:00.000Z'),
      updatedBy: 1,
    };

    const atBoundary = buildVehicleScheduleView(
      row,
      new Date('2026-07-28T17:00:00.000Z'),
    );
    const oneMillisecondLate = buildVehicleScheduleView(
      row,
      new Date('2026-07-28T17:00:00.001Z'),
    );

    assert.equal(atBoundary.isOverdue, false);
    assert.equal(oneMillisecondLate.isOverdue, true);
  });

  test('listActiveVehicleScheduleViews shows only active reminders whose remindAt has arrived and sorts overdue first, then dueAt, then id', () => {
    const now = new Date('2026-07-28T03:00:00.000Z');
    const rows: VehicleScheduleSourceRow[] = [
      {
        id: 9,
        vehicleComponent: VehicleComponent.TRUCK,
        vehicleId: 1,
        vehiclePlate: '15C-100.01',
        kind: VehicleScheduleKind.MAINTENANCE,
        title: 'Bảo dưỡng A',
        documentNumber: null,
        notes: null,
        dueAt: new Date('2026-07-27T23:00:00.000Z'),
        remindAt: new Date('2026-07-27T22:00:00.000Z'),
        status: VehicleScheduleStatus.ACTIVE,
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        createdBy: 1,
        updatedAt: new Date('2026-07-20T00:00:00.000Z'),
        updatedBy: 1,
      },
      {
        id: 5,
        vehicleComponent: VehicleComponent.TRAILER,
        vehicleId: 2,
        vehiclePlate: '15R-200.02',
        kind: VehicleScheduleKind.ROAD_FEE,
        title: 'Phí đường bộ',
        documentNumber: null,
        notes: null,
        dueAt: new Date('2026-07-29T01:00:00.000Z'),
        remindAt: new Date('2026-07-28T01:00:00.000Z'),
        status: VehicleScheduleStatus.ACTIVE,
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        createdBy: 1,
        updatedAt: new Date('2026-07-20T00:00:00.000Z'),
        updatedBy: 1,
      },
      {
        id: 4,
        vehicleComponent: VehicleComponent.TRUCK,
        vehicleId: 3,
        vehiclePlate: '15C-300.03',
        kind: VehicleScheduleKind.DOCUMENT,
        title: 'Hồ sơ xe',
        documentNumber: null,
        notes: null,
        dueAt: new Date('2026-07-29T01:00:00.000Z'),
        remindAt: new Date('2026-07-28T01:00:00.000Z'),
        status: VehicleScheduleStatus.ACTIVE,
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        createdBy: 1,
        updatedAt: new Date('2026-07-20T00:00:00.000Z'),
        updatedBy: 1,
      },
      {
        id: 8,
        vehicleComponent: VehicleComponent.TRUCK,
        vehicleId: 4,
        vehiclePlate: '15C-400.04',
        kind: VehicleScheduleKind.INSURANCE,
        title: 'Bảo hiểm',
        documentNumber: null,
        notes: null,
        dueAt: new Date('2026-07-30T01:00:00.000Z'),
        remindAt: new Date('2026-07-29T01:00:00.000Z'),
        status: VehicleScheduleStatus.ACTIVE,
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        createdBy: 1,
        updatedAt: new Date('2026-07-20T00:00:00.000Z'),
        updatedBy: 1,
      },
      {
        id: 10,
        vehicleComponent: VehicleComponent.TRAILER,
        vehicleId: 5,
        vehiclePlate: '15R-500.05',
        kind: VehicleScheduleKind.OTHER,
        title: 'Đã xong',
        documentNumber: null,
        notes: null,
        dueAt: new Date('2026-07-27T01:00:00.000Z'),
        remindAt: new Date('2026-07-26T01:00:00.000Z'),
        status: VehicleScheduleStatus.COMPLETED,
        completedAt: new Date('2026-07-27T03:00:00.000Z'),
        completedBy: 2,
        cancelledAt: null,
        cancelledBy: null,
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        createdBy: 1,
        updatedAt: new Date('2026-07-27T03:00:00.000Z'),
        updatedBy: 2,
      },
    ];

    const result = listActiveVehicleScheduleViews(rows, now);

    assert.deepEqual(
      result.map((item) => ({ id: item.id, isOverdue: item.isOverdue })),
      [
        { id: 9, isOverdue: true },
        { id: 4, isOverdue: false },
        { id: 5, isOverdue: false },
      ],
    );
  });

  test('resolveVehicleIdentity keeps truck and trailer ids distinct even when the numeric ids collide', async () => {
    const truck = await resolveVehicleIdentity(
      VehicleComponent.TRUCK,
      7,
      {
        findTruckById: async (id) => id === 7 ? { id, licensePlate: '15C-777.77' } : null,
        findTrailerById: async (id) => id === 7 ? { id, licensePlate: '15R-777.77' } : null,
      },
    );
    const trailer = await resolveVehicleIdentity(
      VehicleComponent.TRAILER,
      7,
      {
        findTruckById: async (id) => id === 7 ? { id, licensePlate: '15C-777.77' } : null,
        findTrailerById: async (id) => id === 7 ? { id, licensePlate: '15R-777.77' } : null,
      },
    );

    assert.equal(truck.licensePlate, '15C-777.77');
    assert.equal(trailer.licensePlate, '15R-777.77');
  });

  test('buildVehicleAlertInputFromSchedules maps active canonical schedules back onto the legacy driver-alert fields and ignores future reminders', () => {
    const now = new Date('2026-07-28T03:00:00.000Z');
    const rows: VehicleScheduleSourceRow[] = [
      {
        id: 21,
        vehicleComponent: VehicleComponent.TRUCK,
        vehicleId: 9,
        vehiclePlate: '15C-909.09',
        kind: VehicleScheduleKind.INSPECTION,
        title: 'Đăng kiểm',
        documentNumber: null,
        notes: null,
        dueAt: new Date('2026-08-10T00:00:00.000+07:00'),
        remindAt: new Date('2026-08-01T00:00:00.000+07:00'),
        status: VehicleScheduleStatus.ACTIVE,
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        createdBy: 1,
        updatedAt: new Date('2026-07-20T00:00:00.000Z'),
        updatedBy: 1,
      },
      {
        id: 22,
        vehicleComponent: VehicleComponent.TRUCK,
        vehicleId: 9,
        vehiclePlate: '15C-909.09',
        kind: VehicleScheduleKind.INSURANCE,
        title: 'Bảo hiểm',
        documentNumber: null,
        notes: null,
        dueAt: new Date('2026-08-03T00:00:00.000+07:00'),
        remindAt: new Date('2026-07-27T00:00:00.000+07:00'),
        status: VehicleScheduleStatus.ACTIVE,
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        createdBy: 1,
        updatedAt: new Date('2026-07-20T00:00:00.000Z'),
        updatedBy: 1,
      },
      {
        id: 23,
        vehicleComponent: VehicleComponent.TRUCK,
        vehicleId: 9,
        vehiclePlate: '15C-909.09',
        kind: VehicleScheduleKind.MAINTENANCE,
        title: 'Thay dầu kế tiếp',
        documentNumber: null,
        notes: null,
        dueAt: new Date('2026-07-30T00:00:00.000+07:00'),
        remindAt: new Date('2026-07-25T00:00:00.000+07:00'),
        status: VehicleScheduleStatus.ACTIVE,
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        createdBy: 1,
        updatedAt: new Date('2026-07-20T00:00:00.000Z'),
        updatedBy: 1,
      },
      {
        id: 24,
        vehicleComponent: VehicleComponent.TRUCK,
        vehicleId: 9,
        vehiclePlate: '15C-909.09',
        kind: VehicleScheduleKind.MAINTENANCE,
        title: 'Bảo dưỡng định kỳ',
        documentNumber: null,
        notes: null,
        dueAt: new Date('2026-07-29T00:00:00.000+07:00'),
        remindAt: new Date('2026-07-25T00:00:00.000+07:00'),
        status: VehicleScheduleStatus.ACTIVE,
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        createdBy: 1,
        updatedAt: new Date('2026-07-20T00:00:00.000Z'),
        updatedBy: 1,
      },
      {
        id: 25,
        vehicleComponent: VehicleComponent.TRUCK,
        vehicleId: 9,
        vehiclePlate: '15C-909.09',
        kind: VehicleScheduleKind.INSPECTION,
        title: 'Đăng kiểm cũ',
        documentNumber: null,
        notes: null,
        dueAt: new Date('2026-08-02T00:00:00.000+07:00'),
        remindAt: new Date('2026-07-24T00:00:00.000+07:00'),
        status: VehicleScheduleStatus.CANCELLED,
        completedAt: null,
        completedBy: null,
        cancelledAt: new Date('2026-07-25T00:00:00.000Z'),
        cancelledBy: 2,
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        createdBy: 1,
        updatedAt: new Date('2026-07-25T00:00:00.000Z'),
        updatedBy: 2,
      },
    ];

    const result = buildVehicleAlertInputFromSchedules(rows, now);

    assert.deepEqual(result, {
      nextInspectionDate: null,
      insuranceExpiryDate: '2026-08-03',
      lastOilServiceDate: '2026-07-30',
    });
  });
});
