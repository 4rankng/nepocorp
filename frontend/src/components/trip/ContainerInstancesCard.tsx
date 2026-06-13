import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { api } from '../../lib/api';
import { configClient } from '../../api/configClient';
import { useToast } from '../shared/Toast';
import { qk } from '../../api/keys';
import { useTripFormContext } from '../../hooks/useTripFormContext';
import {
  normalizeContainerNumber,
  validateContainerFormat,
  validateCheckDigit,
  suggestCorrections,
} from '@tingting/shared';

/**
 * Card section embedded in `TripEditPage` / `TripCreatePage` that lets the
 * accountant or manager manage the per-container instances for a trip:
 * container number, seal number, container type, and cargo weight.
 *
 * Pete asked specifically for these to be enter-by-hand alongside the photo
 * upload. Data lives in the `trip_containers` table; reads/writes go through
 * `GET /api/trips/:id/containers` and `PUT /api/trips/:id/containers`.
 *
 * State is local — the card has its own "Lưu container" button independent
 * from the main "Lưu cập nhật" save. Keeping the two flows separate avoids
 * tangling the existing useTripForm hook.
 */

interface ContainerType {
  id: number;
  code: string;
  name: string;
}

interface ContainerRow {
  // Existing row from server keeps its id; new rows have a client-only `_key`.
  id?: number;
  _key: string;
  containerTypeId: number | '';
  containerNumber: string;
  sealNumber: string;
  cargoWeightKg: string;
  notes: string;
}

interface Props {
  tripId: number;
  /** Expected container count from trip header (Số cont). New cards auto-fill
   *  enough rows to match — the user can still add/remove freely. */
  expectedCount?: number;
}

function rowKey() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyRow(): ContainerRow {
  return {
    _key: rowKey(),
    containerTypeId: '',
    containerNumber: '',
    sealNumber: '',
    cargoWeightKg: '',
    notes: '',
  };
}

type ContainerCheckStatus = {
  warning: string | null;
  suggestion: string | null;
};

/**
 * Validate a container number against ISO 6346. Returns a Vietnamese warning
 * and, when a single 1-character correction would fix the check digit, the
 * suggested value so the user can apply it with one click. `null` warning
 * means the number looks fine (or the cell is empty). Catches both OCR
 * misreads and manual typos — the number is never auto-committed, so this is
 * advisory only.
 */
function checkContainerNumber(cn: string): ContainerCheckStatus {
  const trimmed = cn.trim();
  if (!trimmed) return { warning: null, suggestion: null };
  const norm = normalizeContainerNumber(trimmed);
  if (!validateContainerFormat(norm)) {
    return { warning: 'Số cont sai định dạng (4 chữ cái + 7 số).', suggestion: null };
  }
  if (validateCheckDigit(norm)) return { warning: null, suggestion: null };
  const corrections = suggestCorrections(norm, 1);
  return {
    warning: 'Số cont sai chữ số kiểm tra — kiểm tra lại.',
    suggestion: corrections[0] ?? null,
  };
}

export function ContainerInstancesCard({ tripId, expectedCount = 1 }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rows, setRows] = useState<ContainerRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  // Track whether we've seeded rows for this trip, to avoid clobbering local edits on refetch.
  const seededTripRef = useRef<number | null>(null);

  // OCR results are broadcast from the photo uploader (container/seal zone)
  // through the trip-form context. Fill recognized numbers into the first
  // empty cell — never overwriting a value the user already entered. Each
  // upload carries a fresh `nonce`; the ref guard prevents double-filling
  // (incl. React 18 StrictMode's dev double-invoke).
  const { ocrResult } = useTripFormContext();
  const consumedNonceRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!ocrResult) return;
    if (ocrResult.nonce === consumedNonceRef.current) return;
    consumedNonceRef.current = ocrResult.nonce;

    const hasContainers = ocrResult.containerNumbers.length > 0;
    const hasSeal = !!ocrResult.sealNumber;
    if (!hasContainers && !hasSeal) return;

    setRows(prev => {
      const next = prev.map(r => ({ ...r }));
      const fillEmpty = (field: 'containerNumber' | 'sealNumber', values: string[]) => {
        for (const value of values) {
          let slot = next.find(r => !r[field].trim());
          if (!slot) {
            slot = emptyRow();
            next.push(slot);
          }
          slot[field] = value;
        }
      };
      // Extraction is type-specific: a CONTAINER photo yields only container
      // numbers, a SEAL photo only the seal. Fill whichever the broadcast carries.
      fillEmpty('containerNumber', ocrResult.containerNumbers);
      if (hasSeal) fillEmpty('sealNumber', [ocrResult.sealNumber!]);
      return next;
    });
    toast({ kind: 'info', message: 'Đã nhận diện số cont/seal — xem lại trước khi lưu.' });
  }, [ocrResult, toast]);

  // Container types from the global config catalog
  const { data: containerTypes = [] } = useQuery<ContainerType[]>({
    queryKey: qk.catalogs.containerTypes,
    queryFn: () => configClient.getContainerTypes(),
    staleTime: 5 * 60 * 1000,
  });

  // Existing container instances for this trip
  const { data: existing, isLoading } = useQuery<{ items: any[] }>({
    queryKey: qk.tripForm.tripContainers(tripId),
    queryFn: () => api.get(`/trips/${tripId}/containers`),
    enabled: !!tripId,
  });

  // Seed the local rows from the server data once per trip (or after save).
  useEffect(() => {
    if (!existing) return;
    // Skip if we've already seeded for this trip and it hasn't changed.
    if (seededTripRef.current === tripId) return;
    seededTripRef.current = tripId;
    const fromServer: ContainerRow[] = (existing.items || []).map((c: any) => ({
      id: c.id,
      _key: rowKey(),
      containerTypeId: c.containerTypeId ?? '',
      containerNumber: c.containerNumber ?? '',
      sealNumber: c.sealNumber ?? '',
      cargoWeightKg: c.cargoWeightKg ?? '',
      notes: c.notes ?? '',
    }));
    // Top up empty rows to match the expected container count.
    while (fromServer.length < expectedCount) {
      fromServer.push(emptyRow());
    }
    setRows(fromServer);
  }, [existing, expectedCount, tripId]);

  const updateRow = (key: string, field: keyof ContainerRow, value: string | number) => {
    setRows(prev => prev.map(r => (r._key === key ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (key: string) => {
    setRows(prev => prev.filter(r => r._key !== key));
  };

  const handleSave = async () => {
    setPageError(null);
    // Validate: every row needs a non-empty container number
    const cleaned = rows.filter(r =>
      r.containerNumber.trim() ||
      r.sealNumber.trim() ||
      r.cargoWeightKg ||
      r.containerTypeId
    );
    for (const r of cleaned) {
      if (!r.containerNumber.trim()) {
        setPageError('Mỗi cont phải có Số container. Xoá dòng trống nếu chưa nhập.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        containers: cleaned.map(r => ({
          id: r.id,
          containerTypeId: r.containerTypeId === '' ? null : Number(r.containerTypeId),
          containerNumber: r.containerNumber.trim(),
          sealNumber: r.sealNumber.trim() || null,
          cargoWeightKg: r.cargoWeightKg === '' ? null : Number(r.cargoWeightKg),
          notes: r.notes.trim() || null,
        })),
      };
      await api.put(`/trips/${tripId}/containers`, payload);
      // Allow the next refetch to re-seed rows with the saved data.
      seededTripRef.current = null;
      await queryClient.invalidateQueries({ queryKey: qk.tripForm.tripContainers(tripId) });
      await queryClient.invalidateQueries({ queryKey: qk.trips.detail(tripId) });
      toast({ kind: 'success', message: 'Đã lưu danh sách container.' });
    } catch (e: any) {
      setPageError(e?.message || 'Lỗi lưu container');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 16, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Loader2 size={16} className="spin" /> Đang tải container…
      </div>
    );
  }

  return (
    <div>
      {pageError && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--danger-soft)',
          color: 'var(--danger)',
          borderRadius: 8,
          fontSize: 13,
          marginBottom: 12,
        }}>
          {pageError}
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)' }}>
          <p style={{ marginBottom: 12 }}>Chưa có cont nào. Bấm "Thêm cont" để bắt đầu.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((row, idx) => (
            <div
              key={row._key}
              style={{
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: 12,
                background: 'var(--bg-2, #fafafa)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Cont #{idx + 1}</div>
                <button
                  type="button"
                  className="btn btn--ghost btn--icon btn--sm"
                  style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => removeRow(row._key)}
                  aria-label="Xoá dòng"
                  title="Xoá cont"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>
                    Số container <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="VD: TCKU1234567"
                    value={row.containerNumber}
                    onChange={e => updateRow(row._key, 'containerNumber', e.target.value.toUpperCase())}
                  />
                  {(() => {
                    const st = checkContainerNumber(row.containerNumber);
                    if (!st.warning) return null;
                    return (
                      <div style={{
                        marginTop: 6,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 6,
                        alignItems: 'center',
                        padding: '6px 8px',
                        background: 'var(--warn-soft, #fff7e6)',
                        color: 'var(--warn, #b7791f)',
                        borderRadius: 6,
                        fontSize: 11,
                      }}>
                        <span>⚠ {st.warning}</span>
                        {st.suggestion && (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            style={{ minHeight: 26, padding: '0 10px', fontSize: 11 }}
                            onClick={() => updateRow(row._key, 'containerNumber', st.suggestion!)}
                          >
                            Đổi thành {st.suggestion}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>
                    Số seal
                  </label>
                  <input
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="VD: AB123456"
                    value={row.sealNumber}
                    onChange={e => updateRow(row._key, 'sealNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>
                    Loại cont
                  </label>
                  <select
                    className="input"
                    style={{ width: '100%' }}
                    value={row.containerTypeId}
                    onChange={e => updateRow(row._key, 'containerTypeId', e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">— Chọn loại —</option>
                    {containerTypes.map(ct => (
                      <option key={ct.id} value={ct.id}>{ct.name} ({ct.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>
                    Trọng lượng (kg)
                  </label>
                  <input
                    type="number"
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="VD: 24500"
                    value={row.cargoWeightKg}
                    onChange={e => updateRow(row._key, 'cargoWeightKg', e.target.value)}
                    min={0}
                    max={99999999.99}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={addRow}
        >
          <Plus size={14} /> Thêm cont
        </button>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
          {saving ? 'Đang lưu…' : 'Lưu danh sách container'}
        </button>
      </div>
    </div>
  );
}
