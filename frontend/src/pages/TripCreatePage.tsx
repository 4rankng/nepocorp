import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  X,
  Route,
  Fuel,
  DollarSign,
  Camera,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import { FuelMode, LoadingType } from "@nepocorp/shared";
import type { PricingTable, PaginatedResponse } from "@nepocorp/shared";
import { PageHeader, Panel, Btn } from "../components/UI";

interface SelectOption {
  id: number;
  label: string;
}

interface FormLeg {
  id: string;
  sequence: number;
  origin: string;
  destination: string;
  km: string;
  loading_type: LoadingType;
}

export default function TripCreatePage() {
  const navigate = useNavigate();

  // Required fields
  const [customerId, setCustomerId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [truckId, setTruckId] = useState("");
  const [trailerId, setTrailerId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [cargoTypeId, setCargoTypeId] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [customerReference, setCustomerReference] = useState("");

  // Optional fields
  const [legs, setLegs] = useState<FormLeg[]>([]);
  const [fuelMode, setFuelMode] = useState<FuelMode>(FuelMode.AUTO);
  const [fuelLitersOverride, setFuelLitersOverride] = useState("");
  const [fuelSupplementLiters, setFuelSupplementLiters] = useState("");
  const [fuelSupplementReason, setFuelSupplementReason] = useState("");
  const [tollsDiscount, setTollsDiscount] = useState("");
  const [tollsAddition, setTollsAddition] = useState("");
  const [tollsStations, setTollsStations] = useState("");
  const [hasReturnCargo, setHasReturnCargo] = useState(false);
  const [driverSalary, setDriverSalary] = useState("");
  const [revenue, setRevenue] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  // Dropdown options
  const [customers, setCustomers] = useState<SelectOption[]>([]);
  const [routes, setRoutes] = useState<SelectOption[]>([]);
  const [trucks, setTrucks] = useState<SelectOption[]>([]);
  const [trailers, setTrailers] = useState<SelectOption[]>([]);
  const [drivers, setDrivers] = useState<SelectOption[]>([]);
  const [cargoTypes, setCargoTypes] = useState<SelectOption[]>([]);
  const [routeNamesById, setRouteNamesById] = useState<Record<number, string>>(
    {},
  );
  const [pricingTables, setPricingTables] = useState<PricingTable[]>([]);

  // Loading / error state
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [
        custRes,
        routeRes,
        truckRes,
        trailerRes,
        driverRes,
        cargoRes,
        pricingRes,
      ] = await Promise.all([
        api.get<any>("/customers"),
        api.get<any>("/routes"),
        api.get<any>("/trucks"),
        api.get<any>("/trailers"),
        api.get<any>("/drivers"),
        api.get<any>("/cargo-types"),
        api.get<PaginatedResponse<PricingTable>>("/pricing-tables"),
      ]);

      const unwrap = (d: any) => (Array.isArray(d) ? d : (d.items ?? []));
      setCustomers(
        unwrap(custRes).map((c: any) => ({ id: c.id, label: c.name })),
      );
      const routeItems = unwrap(routeRes);
      setRoutes(
        routeItems.map((r: any) => ({
          id: r.id,
          label: `${r.name}${r.distance_km ? ` (${r.distance_km} km)` : ""}`,
        })),
      );
      setRouteNamesById(
        routeItems.reduce((acc: Record<number, string>, route: any) => {
          acc[route.id] = route.name;
          return acc;
        }, {}),
      );
      setTrucks(
        unwrap(truckRes).map((t: any) => ({
          id: t.id,
          label: t.license_plate,
        })),
      );
      setTrailers(
        unwrap(trailerRes).map((t: any) => ({
          id: t.id,
          label: `${t.license_plate} (${t.type})`,
        })),
      );
      setDrivers(
        unwrap(driverRes).map((d: any) => ({ id: d.id, label: d.name })),
      );
      setCargoTypes(
        unwrap(cargoRes).map((c: any) => ({ id: c.id, label: c.name })),
      );
      setPricingTables(
        (pricingRes.items ?? []).map((item: PricingTable) => item),
      );
    } catch {
      setError("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const selectedRouteName = routeId
    ? routeNamesById[Number(routeId)]
    : undefined;

  useEffect(() => {
    if (!selectedRouteName || legs.length > 0) return;
    const [originRaw, destinationRaw] = selectedRouteName.split("→");
    setLegs([
      {
        id: Math.random().toString(),
        sequence: 1,
        origin: originRaw?.trim() || "",
        destination: destinationRaw?.trim() || "",
        km: "",
        loading_type: LoadingType.HANG,
      },
    ]);
  }, [selectedRouteName, legs.length]);

  useEffect(() => {
    if (!customerId || !routeId) {
      setSuggestedPrice(null);
      return;
    }
    const match = pricingTables.find(
      (pt) =>
        pt.customer_id === Number(customerId) &&
        pt.route_id === Number(routeId),
    );
    if (match) {
      const nextPrice = Number(match.price);
      setSuggestedPrice(nextPrice);
      if (!revenue) {
        setRevenue(String(nextPrice));
      }
      return;
    }
    setSuggestedPrice(null);
  }, [customerId, routeId, pricingTables, revenue]);

  const hasLegData = useMemo(
    () => legs.some((leg) => leg.km.trim() !== ""),
    [legs],
  );
  const hasOptionalData = useMemo(
    () =>
      hasLegData ||
      (fuelMode === FuelMode.FLAT_RATE && fuelLitersOverride.trim() !== "") ||
      fuelSupplementLiters.trim() !== "" ||
      fuelSupplementReason.trim() !== "" ||
      tollsDiscount.trim() !== "" ||
      tollsAddition.trim() !== "" ||
      tollsStations.trim() !== "" ||
      hasReturnCargo ||
      driverSalary.trim() !== "" ||
      revenue.trim() !== "" ||
      notes.trim() !== "" ||
      photoUrls.length > 0,
    [
      hasLegData,
      fuelMode,
      fuelLitersOverride,
      fuelSupplementLiters,
      fuelSupplementReason,
      tollsDiscount,
      tollsAddition,
      tollsStations,
      hasReturnCargo,
      driverSalary,
      revenue,
      notes,
      photoUrls,
    ],
  );

  const handleAddLeg = () => {
    setLegs((prev) => {
      const nextSequence = prev.length + 1;
      const lastLeg = prev[prev.length - 1];
      return [
        ...prev,
        {
          id: Math.random().toString(),
          sequence: nextSequence,
          origin: lastLeg ? lastLeg.destination : "",
          destination: "",
          km: "",
          loading_type: LoadingType.HANG,
        },
      ];
    });
  };

  const handleRemoveLeg = (idx: number) => {
    setLegs((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.map((leg, i) => ({
        ...leg,
        sequence: i + 1,
      }));
    });
  };

  const handleUpdateLeg = (
    idx: number,
    field: keyof FormLeg,
    value: string,
  ) => {
    setLegs((prev) =>
      prev.map((leg, i) => {
        if (i === idx) {
          return { ...leg, [field]: value };
        }
        return leg;
      }),
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files);
    const formData = new FormData();
    fileList.forEach((file) => {
      formData.append("files", file);
    });

    setUploading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Lỗi tải ảnh lên");
      }

      const result = await response.json();
      setPhotoUrls((prev) => [...prev, ...result.urls]);
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải ảnh. Vui lòng thử lại.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !customerId ||
      !routeId ||
      !truckId ||
      !trailerId ||
      !driverId ||
      !cargoTypeId ||
      !departureDate
    ) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }

    setSubmitting(true);
    try {
      const createPayload: Record<string, unknown> = {
        customer_id: Number(customerId),
        route_id: Number(routeId),
        truck_id: Number(truckId),
        trailer_id: Number(trailerId),
        driver_id: Number(driverId),
        cargo_type_id: Number(cargoTypeId),
        departure_date: departureDate,
      };
      if (customerReference.trim()) {
        createPayload.customer_reference = customerReference.trim();
      }
      const trip = await api.post<{ id: number }>("/trips", createPayload);

      if (hasOptionalData) {
        const legsToSubmit = legs.filter((leg) => leg.km.trim() !== "");
        for (const leg of legsToSubmit) {
          if (
            !leg.origin.trim() ||
            !leg.destination.trim() ||
            !leg.km ||
            Number.isNaN(Number(leg.km)) ||
            Number(leg.km) <= 0
          ) {
            throw new Error(
              `Chặng số ${leg.sequence} chưa hợp lệ (Km phải lớn hơn 0).`,
            );
          }
        }

        const supplementNum = Number(fuelSupplementLiters);
        if (supplementNum > 0 && !fuelSupplementReason.trim()) {
          throw new Error("Vui lòng điền lý do bổ sung dầu.");
        }

        const preDeparturePayload = {
          legs: legsToSubmit.map((l) => ({
            sequence: l.sequence,
            origin: l.origin.trim(),
            destination: l.destination.trim(),
            km: Number(l.km),
            loading_type: l.loading_type,
          })),
          fuel_mode: fuelMode,
          fuel_liters_override:
            fuelMode === FuelMode.FLAT_RATE
              ? fuelLitersOverride
                ? Number(fuelLitersOverride)
                : 0
              : undefined,
          fuel_supplement_liters: fuelSupplementLiters
            ? Number(fuelSupplementLiters)
            : 0,
          fuel_supplement_reason: fuelSupplementReason.trim() || undefined,
          tolls_discount: tollsDiscount ? Number(tollsDiscount) : 0,
          tolls_addition: tollsAddition ? Number(tollsAddition) : 0,
          tolls_stations: tollsStations ? Number(tollsStations) : 0,
          has_return_cargo: hasReturnCargo,
          driver_salary: driverSalary ? Number(driverSalary) : 0,
          revenue: revenue ? Number(revenue) : undefined,
          notes: notes.trim() || undefined,
          photo_urls: photoUrls,
        };
        await api.put(`/trips/${trip.id}/pre-departure`, preDeparturePayload);
      }
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectCls: React.CSSProperties = {
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23A1A1AA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 32,
  };

  const renderSelect = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: SelectOption[],
    placeholder: string,
    required = true,
  ) => (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && (
          <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>
        )}
      </label>
      <select
        id={id}
        className="input"
        style={selectCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={loadingOptions}
      >
        <option value="">{loadingOptions ? "Đang tải..." : placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  const totalKm = legs.reduce((acc, curr) => acc + (Number(curr.km) || 0), 0);

  return (
    <div className="fade-up">
      <PageHeader
        title="Tạo lệnh vận chuyển mới"
        description="Nhập thông tin để tạo lệnh vận chuyển"
        onBack={() => navigate("/trips")}
      />

      <form onSubmit={handleSubmit}>
        {/* ── Required fields ── */}
        <div className="row-2 fade-up-2">
          <Panel title="Thông tin chính">
            {renderSelect(
              "customer",
              "Khách hàng",
              customerId,
              setCustomerId,
              customers,
              "Chọn khách hàng",
            )}
            {renderSelect(
              "route",
              "Tuyến đường",
              routeId,
              setRouteId,
              routes,
              "Chọn tuyến đường",
            )}
            {renderSelect(
              "cargo-type",
              "Loại hàng",
              cargoTypeId,
              setCargoTypeId,
              cargoTypes,
              "Chọn loại hàng",
            )}

            <div className="field">
              <label htmlFor="customer-ref">
                Mã tham chiếu khách hàng
                <span className="text-muted" style={{ fontWeight: 400, marginLeft: 6 }}>
                  (không bắt buộc)
                </span>
              </label>
              <input
                id="customer-ref"
                className="input"
                value={customerReference}
                onChange={(e) => setCustomerReference(e.target.value)}
                placeholder="VD: PO-12345"
                maxLength={50}
              />
            </div>
          </Panel>

          <Panel title="Phương tiện & tài xế">
            {renderSelect("truck", "Xe đầu", truckId, setTruckId, trucks, "Chọn xe đầu")}
            {renderSelect("trailer", "Rơ moóc", trailerId, setTrailerId, trailers, "Chọn rơ moóc")}
            {renderSelect("driver", "Tài xế", driverId, setDriverId, drivers, "Chọn tài xế")}

            <div className="field">
              <label htmlFor="departure-date">
                Ngày khởi hành
                <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>
              </label>
              <input
                id="departure-date"
                type="date"
                className="input"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                required
              />
            </div>
          </Panel>
        </div>

        {/* ── Divider hint ── */}
        <p className="form-section-hint">
          Các mục dưới đây là tùy chọn — bạn có thể điền ngay hoặc bổ sung sau khi tạo lệnh.
        </p>

        {/* ── Legs section ── */}
        <Panel
          title="Hành trình chi tiết"
          subtitle="Khai báo các chặng đường, cự ly và tải trọng"
          action={
            <Btn variant="ghost" size="sm" icon={<Plus size={14} />} onClick={handleAddLeg}>
              Thêm chặng
            </Btn>
          }
          className="fade-up-3"
        >
          {legs.length === 0 ? (
            <div className="form-empty">
              Chưa có chặng nào. Bấm "Thêm chặng" để khai báo hành trình.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {legs.map((leg, idx) => (
                  <div key={leg.id} className="leg-card">
                    <div className="leg-card__head">
                      <div className="leg-card__label">
                        <span className="leg-card__seq">{leg.sequence}</span>
                        Chặng {leg.sequence}
                      </div>
                      {legs.length > 1 && (
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon btn--sm"
                          onClick={() => handleRemoveLeg(idx)}
                          aria-label="Xóa chặng"
                        >
                          <Trash2 size={15} style={{ color: "var(--danger)" }} />
                        </button>
                      )}
                    </div>

                    <div className="leg-card__route">
                      <input
                        className="input input--sm"
                        placeholder="Điểm đi"
                        value={leg.origin}
                        onChange={(e) => handleUpdateLeg(idx, "origin", e.target.value)}
                      />
                      <span className="leg-card__arrow">→</span>
                      <input
                        className="input input--sm"
                        placeholder="Điểm đến"
                        value={leg.destination}
                        onChange={(e) => handleUpdateLeg(idx, "destination", e.target.value)}
                      />
                    </div>

                    <div className="leg-card__fields">
                      <div>
                        <div className="leg-card__mini-label">Cự ly (Km)</div>
                        <input
                          className="input input--sm"
                          type="number"
                          placeholder="Km"
                          value={leg.km}
                          onChange={(e) => handleUpdateLeg(idx, "km", e.target.value)}
                        />
                      </div>
                      <div>
                        <div className="leg-card__mini-label">Tải trọng</div>
                        <select
                          className="input input--sm"
                          value={leg.loading_type}
                          onChange={(e) =>
                            handleUpdateLeg(idx, "loading_type", e.target.value as LoadingType)
                          }
                        >
                          <option value={LoadingType.HANG}>Có hàng</option>
                          <option value={LoadingType.VO}>Vỏ rỗng</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-summary">
                <span>
                  Tổng số chặng: <strong>{legs.length}</strong>
                </span>
                <span>
                  Tổng cự ly: <strong>{totalKm.toLocaleString("vi-VN")} Km</strong>
                </span>
              </div>
            </>
          )}
        </Panel>

        {/* ── Fuel + Tolls ── */}
        <div className="row-2 fade-up-4">
          <Panel title="Nhiên liệu" subtitle="Định mức tiêu thụ và bổ sung">
            <div className="field">
              <label>Chế độ dầu</label>
              <select
                className="input"
                style={selectCls}
                value={fuelMode}
                onChange={(e) => setFuelMode(e.target.value as FuelMode)}
              >
                <option value={FuelMode.AUTO}>Tự động (Định mức × Km chặng)</option>
                <option value={FuelMode.FLAT_RATE}>Khoán (Nhập thủ công)</option>
              </select>
            </div>

            {fuelMode === FuelMode.FLAT_RATE && (
              <div className="field">
                <label>Số lít dầu khoán</label>
                <input
                  className="input"
                  type="number"
                  placeholder="VD: 55"
                  value={fuelLitersOverride}
                  onChange={(e) => setFuelLitersOverride(e.target.value)}
                />
              </div>
            )}

            <div className="row-2">
              <div className="field">
                <label>Số lít bổ sung</label>
                <input
                  className="input"
                  type="number"
                  placeholder="VD: 3"
                  value={fuelSupplementLiters}
                  onChange={(e) => setFuelSupplementLiters(e.target.value)}
                />
              </div>
              <div className="field">
                <label>
                  Lý do bổ sung{" "}
                  {Number(fuelSupplementLiters) > 0 && (
                    <span style={{ color: "var(--danger)" }}>*</span>
                  )}
                </label>
                <input
                  className="input"
                  placeholder="VD: Chạy máy lạnh kéo dài"
                  value={fuelSupplementReason}
                  onChange={(e) => setFuelSupplementReason(e.target.value)}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Vé đường & tài chính" subtitle="Chi phí đường bộ và doanh thu">
            <div className="row-2">
              <div className="field">
                <label>Tăng vé theo lệnh (VNĐ)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="VD: 150000"
                  value={tollsAddition}
                  onChange={(e) => setTollsAddition(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Giảm vé QL5 (VNĐ)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="VD: 40000"
                  value={tollsDiscount}
                  onChange={(e) => setTollsDiscount(e.target.value)}
                />
              </div>
            </div>

            <div className="row-2" style={{ alignItems: "center" }}>
              <div className="field">
                <label>Số trạm thu phí</label>
                <input
                  className="input"
                  type="number"
                  placeholder="VD: 4"
                  value={tollsStations}
                  onChange={(e) => setTollsStations(e.target.value)}
                />
              </div>
              <div className="field" style={{ display: "flex", alignItems: "center", height: "100%", paddingTop: 18 }}>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={hasReturnCargo}
                    onChange={(e) => setHasReturnCargo(e.target.checked)}
                  />
                  <span>Chuyến về có hàng (+300k)</span>
                </label>
              </div>
            </div>

            <div className="row-2">
              <div className="field">
                <label>Lương sản lượng tài xế (VNĐ)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="VD: 850000"
                  value={driverSalary}
                  onChange={(e) => setDriverSalary(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Doanh thu chuyến (VNĐ)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="VD: 4200000"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                />
                {suggestedPrice !== null && (
                  <div className="field-help">
                    Giá gợi ý từ bảng giá: {Number(suggestedPrice).toLocaleString("vi-VN")} VNĐ
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </div>

        {/* ── Photos & Notes ── */}
        <Panel title="Hình ảnh & ghi chú" subtitle="Ảnh đính kèm và ghi chú chuyến đi" className="fade-up-5">
          <div className="photo-grid">
            {photoUrls.map((url, i) => (
              <div key={i} className="photo-thumb">
                <img src={url} alt={`Preview ${i + 1}`} />
                <button
                  type="button"
                  className="photo-thumb__remove"
                  onClick={() => handleRemovePhoto(i)}
                >
                  <X size={10} />
                </button>
              </div>
            ))}

            <label className="photo-upload">
              {uploading ? (
                <Loader2 size={18} className="spin" />
              ) : (
                <>
                  <ImageIcon size={18} />
                  <span style={{ fontSize: 9, marginTop: 4 }}>Tải ảnh</span>
                </>
              )}
              <input
                type="file"
                multiple
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>
          </div>

          <div className="field">
            <label>Ghi chú chuyến đi</label>
            <textarea
              className="input"
              style={{ minHeight: 80, resize: "vertical" }}
              placeholder="Ghi chú chi tiết chuyến đi, các lưu ý đặc biệt..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </Panel>

        {/* ── Error ── */}
        {error && <div className="form-alert form-alert--danger">{error}</div>}

        {/* ── Actions ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn
            variant="primary"
            icon={submitting ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            disabled={submitting || loadingOptions || uploading}
          >
            {submitting ? "Đang tạo..." : "Tạo lệnh"}
          </Btn>
          <Btn
            variant="secondary"
            onClick={() => navigate("/trips")}
            disabled={submitting}
          >
            Huỷ
          </Btn>
        </div>
      </form>
    </div>
  );
}
