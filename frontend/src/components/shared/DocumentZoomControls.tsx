import { Minus, Plus } from 'lucide-react';
import './DocumentZoomControls.css';

interface DocumentZoomControlsProps {
  percent: number;
  fitActive: boolean;
  disabled?: boolean;
  onZoomChange: (percent: number) => void;
  onFitWidth: () => void;
}

/** Shared viewing controls; zoom never changes the exported document. */
export function DocumentZoomControls({ percent, fitActive, disabled = false, onZoomChange, onFitWidth }: DocumentZoomControlsProps) {
  const changeZoom = (direction: number) => onZoomChange(Math.max(25, Math.min(200, percent + direction * 25)));
  return <div className="document-zoom-controls" role="group" aria-label="Thu phóng bản xem trước">
    <button type="button" className="btn btn--secondary btn--sm" disabled={disabled || percent <= 25} onClick={() => changeZoom(-1)} aria-label="Thu nhỏ"><Minus size={16} /></button>
    <output className="document-zoom-controls__scale" aria-label="Mức thu phóng" aria-live="polite">{percent}%</output>
    <button type="button" className="btn btn--secondary btn--sm" disabled={disabled || percent >= 200} onClick={() => changeZoom(1)} aria-label="Phóng to"><Plus size={16} /></button>
    <button type="button" className="btn btn--secondary btn--sm" disabled={disabled} aria-pressed={fitActive} onClick={onFitWidth}>Vừa chiều rộng</button>
    <button type="button" className="btn btn--secondary btn--sm" disabled={disabled} aria-pressed={!fitActive && percent === 100} onClick={() => onZoomChange(100)}>100%</button>
  </div>;
}
