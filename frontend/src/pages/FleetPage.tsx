import { useCallback, useMemo, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Truck, Container, UserCheck, Download, CheckCircle, CalendarPlus } from "lucide-react";
import { downloadCSV } from "../lib/csv";
import { PageHeader, Btn, KPI } from "../components/UI";
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { useCRUD } from "../hooks/useCRUD";
import { useTrucksAndDrivers } from "../hooks/useCatalogQueries";
import { usePageAnimations } from "../hooks/animations";
import { configClient } from "../api/configClient";
import { qk } from "../api/keys";
import {
  TRAILER_STATUS_LABELS,
  TRAILER_TYPE_LABELS,
  TrailerType,
  VehicleComponent,
} from "@tingting/shared";
import type { Truck as TruckType, Driver, VehicleSchedule } from "@tingting/shared";

// Extracted form modals + shared fleet constants
import { TRUCK_STATUS, fleetStyles as styles } from "../features/fleet";

import "./FleetPage.css";

import { TrailerCard } from '../features/fleet/trailer-card';
import { TruckCard } from '../features/fleet/truck-card';
import { DriverCard } from '../features/fleet/driver-card';
import { VehicleScheduleBanner } from '../features/fleet/schedules/VehicleScheduleBanner';
import { VehicleScheduleManager } from '../features/fleet/schedules/VehicleScheduleManager';
import {
  VehicleScheduleVehiclePicker,
  type VehicleSchedulePickerOption,
} from '../features/fleet/schedules/VehicleScheduleVehiclePicker';
import type { VehicleScheduleOpenMode } from '../features/fleet/schedules/VehicleScheduleTrigger';
import {
  useActiveVehicleSchedules,
  useAllActiveVehicleSchedules,
  useVehicleScheduleHistory,
  useVehicleScheduleMutations,
} from '../hooks/useVehicleSchedules';

export default function FleetPage() {
  const [isScheduleVehiclePickerOpen, setIsScheduleVehiclePickerOpen] = useState(false);
  const [selectedScheduleVehicle, setSelectedScheduleVehicle] = useState<{
    vehicleComponent: VehicleComponent;
    vehicleId: number;
    vehiclePlate: string;
    mode: VehicleScheduleOpenMode;
  } | null>(null);
  const queryClient = useQueryClient();
  const { rootRef } = usePageAnimations({ ready: true });
  const { data: fleetData } = useTrucksAndDrivers();
  const { data: trailers = [] } = useQuery({
    queryKey: qk.catalogs.trailers,
    queryFn: () => configClient.getTrailers(),
    staleTime: 60_000,
  });
  const trucks = useMemo(() => fleetData?.trucks ?? [], [fleetData?.trucks]);
  const drivers = useMemo(() => fleetData?.drivers ?? [], [fleetData?.drivers]);
  const {
    data: activeSchedules = [],
    isError: scheduleLoadFailed,
    refetch: retrySchedules,
  } = useActiveVehicleSchedules();
  const {
    data: allActiveSchedules = [],
    isError: allActiveSchedulesFailed,
    refetch: retryAllActiveSchedules,
  } = useAllActiveVehicleSchedules();
  const {
    data: selectedVehicleSchedules = [],
    isLoading: scheduleHistoryLoading,
  } = useVehicleScheduleHistory(
    selectedScheduleVehicle?.vehicleComponent,
    selectedScheduleVehicle?.vehicleId,
    selectedScheduleVehicle !== null,
  );
  const scheduleMutations = useVehicleScheduleMutations();

  const invalidateFleet = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: qk.catalogs.trucksDrivers });
  }, [queryClient]);

  const truckCrud = useCRUD("/trucks", invalidateFleet);
  const driverCrud = useCRUD("/drivers", invalidateFleet);
  // Trailers are a separate catalog so a rơ-moóc can be coupled to different
  // đầu kéo over time. Invalidate both the trailers list AND fleet (since
  // the truck rows display the coupled trailer's plate).
  const trailerCrud = useCRUD("/trailers", async () => {
    await queryClient.invalidateQueries({ queryKey: qk.catalogs.trailers });
    await invalidateFleet();
  });

  const { truckMap, driverByTruck, activeTrucks, maintTrucks, assignedDrivers, activeDrivers, readyToRun } = useMemo(() => {
    const truckMap = new Map<number, TruckType>();
    trucks.forEach((t) => truckMap.set(t.id, t));

    const driverByTruck = new Map<number, Driver>();
    drivers.forEach((d) => {
      if (d.assignedTruckId) driverByTruck.set(d.assignedTruckId, d);
    });

    const activeTrucks = trucks.filter((t) => t.status === "ACTIVE").length;
    const maintTrucks = trucks.filter((t) => t.status === "MAINTENANCE").length;
    const assignedDrivers = drivers.filter((d) => d.assignedTruckId).length;
    const activeDrivers = drivers.filter((d) => d.status === "ACTIVE").length;
    const readyToRun = trucks.filter((t) => t.status === "ACTIVE" && driverByTruck.has(t.id)).length;

    return { truckMap, driverByTruck, activeTrucks, maintTrucks, assignedDrivers, activeDrivers, readyToRun };
  }, [trucks, drivers]);

  const ft40 = trailers.filter((t) => t.type === TrailerType.FT40).length;
  const ft20 = trailers.filter((t) => t.type === TrailerType.FT20).length;
  const schedulesByVehicle = useMemo(() => {
    const grouped = new Map<string, VehicleSchedule[]>();
    allActiveSchedules.forEach(schedule => {
      const key = `${schedule.vehicleComponent}:${schedule.vehicleId}`;
      grouped.set(key, [...(grouped.get(key) ?? []), schedule]);
    });
    return grouped;
  }, [allActiveSchedules]);
  const scheduleMutationPending = Object.values(scheduleMutations)
    .some(mutation => mutation.isPending);
  const scheduleTruckOptions = useMemo<VehicleSchedulePickerOption[]>(() => trucks.map(truck => ({
    id: truck.id,
    plate: truck.licensePlate,
    meta: TRUCK_STATUS[truck.status] || truck.status,
  })), [trucks]);
  const scheduleTrailerOptions = useMemo<VehicleSchedulePickerOption[]>(() => trailers.map(trailer => ({
    id: trailer.id,
    plate: trailer.licensePlate,
    meta: `${TRAILER_TYPE_LABELS[trailer.type]} · ${TRAILER_STATUS_LABELS[trailer.status]}`,
  })), [trailers]);

  return (
    <div className="fleet-page" ref={rootRef}>
      <Breadcrumbs
        className="fleet-page__crumbs"
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: 'Đội xe' },
        ]}
      />
      <PageHeader
        title="Đội xe"
        iconName="tractor-head"
        description="Quản lý xe đầu kéo, rơ-moóc và lái xe trong một trang"
        action={
          <div style={styles.actionRow}>
            <Btn
              variant="primary"
              size="sm"
              icon={<CalendarPlus size={15} />}
              onClick={() => setIsScheduleVehiclePickerOpen(true)}
            >
              Thêm lịch
            </Btn>
            <Btn
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={async () => {
                const headers = ["Loại", "Biển số", "Trạng thái", "Lái xe gán"];
                const rows = [...trucks.map((t) => ["Xe đầu kéo", t.licensePlate, TRUCK_STATUS[t.status] || t.status, driverByTruck.has(t.id) ? driverByTruck.get(t.id)!.name : "—"])];
                await downloadCSV(`doi-xe-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows, {
                  title: "DANH SÁCH ĐỘI XE",
                  subtitle: `${trucks.length} xe đầu kéo đang quản lý`,
                  columnTypes: ["text", "text", "text", "text"],
                  hideTotals: true,
                });
              }}
            >
                Xuất Excel
              </Btn>
            </div>
        }
      />

      {/* KPI Strip */}
      <div className="kpi-grid">
        <KPI
          label="Xe đầu kéo"
          value={trucks.length}
          unit="xe"
          icon={Truck}
          assetIconName="tractor-head"
          variant="success"
          meta={
            <span className="fleet-kpi-meta" style={styles.metaRow}>
              <span className="fleet-kpi-dot fleet-kpi-dot--success" style={styles.dotSuccess} />
              <span className="fleet-kpi-meta__good" style={styles.textSuccess}>
                {activeTrucks} hoạt động
              </span>
              <span className="fleet-kpi-meta__sep" style={styles.textMuted}>
                ·
              </span>
              <span className="fleet-kpi-dot fleet-kpi-dot--warn" style={styles.dotWarning} />
              <span className="fleet-kpi-meta__warn" style={styles.textWarning}>
                {maintTrucks} bảo trì
              </span>
            </span>
          }
        />
        <KPI
          label="Rơ-moóc"
          value={ft40 + ft20}
          unit="moóc"
          icon={Container}
          assetIconName="semi-trailer"
          variant="info"
          meta={
            <span className="fleet-kpi-meta" style={styles.metaRow}>
              <span className="fleet-kpi-meta__mono" style={styles.fontMono}>
                {ft40}×40FT
              </span>
              <span className="fleet-kpi-meta__sep" style={styles.textMuted}>
                ·
              </span>
              <span className="fleet-kpi-meta__mono" style={styles.fontMono}>
                {ft20}×20FT
              </span>
            </span>
          }
        />
        <KPI
          label="Lái xe"
          value={activeDrivers}
          unit="người"
          icon={UserCheck}
          assetIconName="driver"
          variant="warn"
          meta={
            <span className="fleet-kpi-meta" style={styles.metaRow}>
              <span className="fleet-kpi-dot fleet-kpi-dot--success" style={styles.dotSuccess} />
              <span className="fleet-kpi-meta__good" style={styles.textSuccess}>
                {activeDrivers} đang làm
              </span>
              <span className="fleet-kpi-meta__sep" style={styles.textMuted}>
                ·
              </span>
              <span>
                {assignedDrivers}/{activeDrivers} phân xe
              </span>
            </span>
          }
        />
        <KPI
          label="Sẵn sàng chạy"
          value={readyToRun}
          unit={`/ ${activeTrucks + maintTrucks || trucks.length} đầu kéo`}
          icon={CheckCircle}
          assetIconName="checklist"
          variant="default"
          meta={
            <span className="fleet-kpi-meta" style={styles.metaRow}>
              {readyToRun >= activeTrucks ? (
                <span className="fleet-kpi-meta__good" style={styles.textSuccess}>
                  Đủ xe + lái xe
                </span>
              ) : (
                <>
                  <span>{readyToRun} sẵn sàng</span>
                  <span className="fleet-kpi-meta__sep" style={styles.textMuted}>
                    ·
                  </span>
                  <span className="fleet-kpi-meta__warn" style={styles.textWarning}>
                    {activeTrucks - readyToRun} cần phân xe
                  </span>
                </>
              )}
            </span>
          }
        />
      </div>

      {scheduleLoadFailed || allActiveSchedulesFailed ? (
        <div className="fleet-schedule-load-error" role="status">
          <span>Không tải được lịch phương tiện.</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void Promise.all([retrySchedules(), retryAllActiveSchedules()])}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <VehicleScheduleBanner
          items={activeSchedules}
          testId="vehicle-schedule-banner-fleet"
        />
      )}

      {/* Trucks (đầu kéo) */}
      <TruckCard
        trucks={trucks}
        driverByTruck={driverByTruck}
        trailers={trailers}
        crud={truckCrud}
        schedulesByVehicle={schedulesByVehicle}
        onOpenSchedules={(vehicleId, vehiclePlate, mode) => setSelectedScheduleVehicle({
          vehicleComponent: VehicleComponent.TRUCK,
          vehicleId,
          vehiclePlate,
          mode,
        })}
      />

      {/* Trailers (rơ-moóc) — separate catalog so a rơ-moóc can be coupled
          to different đầu kéo over time, and so repair / đăng kiểm / thay
          lốp expenses can be split between truck and trailer. */}
      <TrailerCard
        trailers={trailers}
        trucks={trucks}
        crud={trailerCrud}
        schedulesByVehicle={schedulesByVehicle}
        onOpenSchedules={(vehicleId, vehiclePlate, mode) => setSelectedScheduleVehicle({
          vehicleComponent: VehicleComponent.TRAILER,
          vehicleId,
          vehiclePlate,
          mode,
        })}
      />

      {/* Drivers */}
      <DriverCard drivers={drivers} truckMap={truckMap} crud={driverCrud} />

      <VehicleScheduleVehiclePicker
        isOpen={isScheduleVehiclePickerOpen}
        trucks={scheduleTruckOptions}
        trailers={scheduleTrailerOptions}
        onClose={() => setIsScheduleVehiclePickerOpen(false)}
        onSelect={(vehicleComponent, vehicle) => {
          setIsScheduleVehiclePickerOpen(false);
          setSelectedScheduleVehicle({
            vehicleComponent: vehicleComponent === 'TRUCK'
              ? VehicleComponent.TRUCK
              : VehicleComponent.TRAILER,
            vehicleId: vehicle.id,
            vehiclePlate: vehicle.plate,
            mode: 'create',
          });
        }}
      />

      {selectedScheduleVehicle && (
        <VehicleScheduleManager
          isOpen
          initialMode={selectedScheduleVehicle.mode}
          vehicleComponent={selectedScheduleVehicle.vehicleComponent}
          vehicleId={selectedScheduleVehicle.vehicleId}
          vehiclePlate={selectedScheduleVehicle.vehiclePlate}
          items={selectedVehicleSchedules}
          loading={scheduleHistoryLoading}
          saving={scheduleMutationPending}
          onClose={() => setSelectedScheduleVehicle(null)}
          onCreate={draft => scheduleMutations.create.mutateAsync({
            ...draft,
            vehicleComponent: selectedScheduleVehicle.vehicleComponent,
            vehicleId: selectedScheduleVehicle.vehicleId,
          })}
          onUpdate={(id, draft) => scheduleMutations.update.mutateAsync({ id, input: draft })}
          onComplete={id => scheduleMutations.complete.mutateAsync(id)}
          onCancel={id => scheduleMutations.cancel.mutateAsync(id)}
        />
      )}
    </div>
  );
}
