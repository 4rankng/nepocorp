/**
 * ShipmentFormModal — tạo/sửa lô hàng (NEPO-61).
 * Create: customer + flowType only are meaningful up front (the lô code is
 * server-generated); sea fields, dates and tờ khai edit any time.
 * Edit: customer select is disabled — the backend rejects a customer change
 * on an existing lô.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { TripFlowType } from '@tingting/shared';
import type { Role, Shipment, ShipmentDetail } from '@tingting/shared';
import { Modal } from '../../components/UI';
import { SearchableSelect } from '../../design-system';
import { useToast } from '../../components/shared/Toast';
import { formatErrorMessage } from '../../lib/api';
import { useTripOptions } from '../../hooks/useTripOptions';
import {
  useCreateShipment,
  useUpdateShipment,
} from '../../hooks/useShipmentQueries';
import { canWriteShipments } from './shipmentDisplay';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** When set the modal edits this lô; otherwise it creates a new one. */
  shipment?: Shipment | ShipmentDetail | null;
  /** Caller refreshes routing after create (e.g. navigate to the new detail). */
  onCreated?: (shipment: Shipment) => void;
}

interface FormState {
  customerId: string;
  flowType: TripFlowType | '';
  shippingLine: string;
  bookingNo: string;
  blNo: string;
  vesselVoyage: string;
  pol: string;
  pod: string;
  etd: string;
  eta: string;
  cutoffDate: string;
  containerSeals: string;
  customsDeclarationNo: string;
  customsDeclarationDate: string;
  notes: string;
}

function formFromShipment(s: Shipment | null): FormState {
  return {
    customerId: s?.customerId != null ? String(s.customerId) : '',
    flowType: s?.flowType ?? '',
    shippingLine: s?.shippingLine ?? '',
    bookingNo: s?.bookingNo ?? '',
    blNo: s?.blNo ?? '',
    vesselVoyage: s?.vesselVoyage ?? '',
    pol: s?.pol ?? '',
    pod: s?.pod ?? '',
    etd: s?.etd ?? '',
    eta: s?.eta ?? '',
    cutoffDate: s?.cutoffDate ?? '',
    containerSeals: s?.containerSeals ?? '',
    customsDeclarationNo: s?.customsDeclarationNo ?? '',
    customsDeclarationDate: s?.customsDeclarationDate ?? '',
    notes: s?.notes ?? '',
  };
}

const EMPTY_FORM: FormState = formFromShipment(null);

const FLOW_TYPE_OPTIONS = [
  { value: TripFlowType.XUAT, label: 'Hàng xuất' },
  { value: TripFlowType.NHAP, label: 'Hàng nhập' },
];

export default function ShipmentFormModal({ isOpen, onClose, shipment, onCreated }: Props) {
  const isEdit = !!shipment;
  const { toast } = useToast();
  const { customers, loading: optionsLoading } = useTripOptions();
  const [form, setForm] = useState<FormState>(() => formFromShipment(shipment ?? null));
  const [validation, setValidation] = useState<string | null>(null);
  const createMutation = useCreateShipment();
  const updateMutation = useUpdateShipment(shipment?.id ?? 0);
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isOpen) {
      setForm(formFromShipment(shipment ?? null));
      setValidation(null);
    }
  }, [isOpen, shipment]);

  const set = (patch: Partial<FormState>) => setForm(prev => ({ ...prev, ...patch }));

  const customerOptions = useMemo(
    () => customers.map(c => ({ value: String(c.id), label: c.label, searchText: c.label })),
    [customers],
  );
  // Edit mode: make sure the current customer is selectable even if it fell
  // out of the options list.
  const effectiveCustomerOptions = useMemo(() => {
    if (!isEdit || !shipment?.customerName) return customerOptions;
    const value = String(shipment.customerId);
    if (customerOptions.some(o => o.value === value)) return customerOptions;
    return [
      { value, label: shipment.customerName, searchText: shipment.customerName },
      ...customerOptions,
    ];
  }, [customerOptions, isEdit, shipment]);

  const validate = (): string | null => {
    if (!form.customerId) return 'Khách hàng là bắt buộc.';
    return null;
  };

  const handleSave = async () => {
    const invalid = validate();
    if (invalid) {
      setValidation(invalid);
      return;
    }
    setValidation(null);
    const payload = {
      customerId: Number(form.customerId),
      flowType: form.flowType === '' ? null : (form.flowType as TripFlowType),
      shippingLine: form.shippingLine.trim() || null,
      bookingNo: form.bookingNo.trim() || null,
      blNo: form.blNo.trim() || null,
      vesselVoyage: form.vesselVoyage.trim() || null,
      pol: form.pol.trim() || null,
      pod: form.pod.trim() || null,
      etd: form.etd || null,
      eta: form.eta || null,
      cutoffDate: form.cutoffDate || null,
      containerSeals: form.containerSeals.trim() || null,
      customsDeclarationNo: form.customsDeclarationNo.trim() || null,
      customsDeclarationDate: form.customsDeclarationDate || null,
      notes: form.notes.trim() || null,
    };
    try {
      if (isEdit && shipment) {
        // The customer never changes on an existing lô — backend rejects it.
        await updateMutation.mutateAsync(payload);
        toast({ kind: 'success', message: 'Đã cập nhật lô hàng.' });
        onClose();
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast({ kind: 'success', message: `Đã tạo lô ${created.shipmentCode}.` });
        onClose();
        onCreated?.(created);
      }
    } catch (err) {
      toast({ kind: 'error', message: formatErrorMessage(err) });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={isEdit ? `Sửa lô — ${shipment?.shipmentCode ?? ''}` : 'Thêm lô hàng'}
      onClose={onClose}
      maxWidth={620}
      footer={(
        <>
          <button className="btn btn--ghost btn--sm" onClick={onClose} type="button">
            <X size={14} /> Hủy
          </button>
          <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving} type="button">
            {saving ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
            {isEdit ? 'Cập nhật' : 'Tạo lô'}
          </button>
        </>
      )}
    >
      <div className="shipment-form">
        {validation && <p className="shipment-form__error" role="alert">{validation}</p>}

        <div className="shipment-form__grid">
          <div className="field">
            <label htmlFor="shipment-customer">Khách hàng <span style={{ color: 'var(--danger)' }}>*</span></label>
            <SearchableSelect
              id="shipment-customer"
              value={form.customerId}
              onChange={v => set({ customerId: v })}
              options={effectiveCustomerOptions}
              placeholder={optionsLoading ? 'Đang tải khách hàng…' : 'Chọn khách hàng'}
              searchPlaceholder="Tìm khách hàng…"
              emptyMessage="Không tìm thấy khách hàng phù hợp."
              disabled={isEdit || optionsLoading}
              required
            />
            {isEdit && (
              <small className="shipment-form__hint">Không thể đổi khách hàng trên lô đã tạo.</small>
            )}
          </div>
          <div className="field">
            <label htmlFor="shipment-flow">Loại hàng</label>
            <select
              id="shipment-flow"
              className="input"
              value={form.flowType}
              onChange={e => set({ flowType: e.target.value as TripFlowType | '' })}
            >
              <option value="">— Chưa rõ —</option>
              {FLOW_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="shipment-form__grid">
          <div className="field">
            <label htmlFor="shipment-line">Hãng tàu</label>
            <input id="shipment-line" className="input" value={form.shippingLine} onChange={e => set({ shippingLine: e.target.value })} placeholder="Maersk, MSC…" />
          </div>
          <div className="field">
            <label htmlFor="shipment-vessel">Tàu / Chuyến</label>
            <input id="shipment-vessel" className="input" value={form.vesselVoyage} onChange={e => set({ vesselVoyage: e.target.value })} placeholder="TENMA TRIBE 0510-037W" />
          </div>
        </div>

        <div className="shipment-form__grid">
          <div className="field">
            <label htmlFor="shipment-booking">Số Booking</label>
            <input id="shipment-booking" className="input" value={form.bookingNo} onChange={e => set({ bookingNo: e.target.value })} placeholder="SILN2603111A" />
          </div>
          <div className="field">
            <label htmlFor="shipment-bl">Số B/L</label>
            <input id="shipment-bl" className="input" value={form.blNo} onChange={e => set({ blNo: e.target.value })} placeholder="SILN2604227B" />
          </div>
        </div>

        <div className="shipment-form__grid">
          <div className="field">
            <label htmlFor="shipment-pol">POL (cảng đi)</label>
            <input id="shipment-pol" className="input" value={form.pol} onChange={e => set({ pol: e.target.value })} placeholder="HPH" />
          </div>
          <div className="field">
            <label htmlFor="shipment-pod">POD (cảng đến)</label>
            <input id="shipment-pod" className="input" value={form.pod} onChange={e => set({ pod: e.target.value })} placeholder="CNSHA" />
          </div>
        </div>

        <div className="shipment-form__grid shipment-form__grid--3">
          <div className="field">
            <label htmlFor="shipment-etd">ETD</label>
            <input id="shipment-etd" className="input" type="date" value={form.etd} onChange={e => set({ etd: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="shipment-eta">ETA</label>
            <input id="shipment-eta" className="input" type="date" value={form.eta} onChange={e => set({ eta: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="shipment-cutoff">Cut-off</label>
            <input id="shipment-cutoff" className="input" type="date" value={form.cutoffDate} onChange={e => set({ cutoffDate: e.target.value })} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="shipment-seals">Số container / Seal</label>
          <textarea
            id="shipment-seals"
            className="input"
            rows={2}
            value={form.containerSeals}
            onChange={e => set({ containerSeals: e.target.value })}
            placeholder="TCLU1234567 / SL1234&#10;MSKU7654321 / SL5678"
          />
        </div>

        <div className="shipment-form__grid">
          <div className="field">
            <label htmlFor="shipment-customs-no">Số tờ khai hải quan</label>
            <input id="shipment-customs-no" className="input" value={form.customsDeclarationNo} onChange={e => set({ customsDeclarationNo: e.target.value })} placeholder="BD317438A1" />
          </div>
          <div className="field">
            <label htmlFor="shipment-customs-date">Ngày đăng ký tờ khai</label>
            <input id="shipment-customs-date" className="input" type="date" value={form.customsDeclarationDate} onChange={e => set({ customsDeclarationDate: e.target.value })} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="shipment-notes">Ghi chú</label>
          <textarea id="shipment-notes" className="input" rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
