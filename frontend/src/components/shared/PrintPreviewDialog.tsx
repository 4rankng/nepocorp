import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Printer, X } from 'lucide-react';
import { isTopmostDialog, useDialogFocus } from './useDialogFocus';
import { DocumentZoomControls } from './DocumentZoomControls';
import './PrintPreviewDialog.css';

interface PrintPreviewDialogProps {
  title: string;
  loadHtml: () => Promise<string>;
  onClose: () => void;
}

const DOCUMENT_WIDTH = 900;

/** A continuous print document; pagination belongs to the browser's print dialog. */
export function PrintPreviewDialog({ title, loadHtml, onClose }: PrintPreviewDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameCleanupRef = useRef<(() => void) | undefined>(undefined);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [attempt, setAttempt] = useState(0);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [documentSize, setDocumentSize] = useState({ width: DOCUMENT_WIDTH, height: 900 });
  const [availableWidth, setAvailableWidth] = useState(DOCUMENT_WIDTH);
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const scale = zoom === 'fit' ? Math.min(1, availableWidth / documentSize.width) : zoom / 100;
  const percent = Math.round(scale * 100);
  useDialogFocus(dialogRef, true);

  useEffect(() => {
    let current = true;
    frameCleanupRef.current?.();
    frameCleanupRef.current = undefined;
    setDocumentSize({ width: DOCUMENT_WIDTH, height: 900 });
    setHtml(null);
    setReady(false);
    setError(false);
    loadHtml().then(value => {
      if (!current) return;
      if (!value.trim()) { setError(true); return; }
      setHtml(value);
    }).catch(() => { if (current) setError(true); });
    return () => { current = false; };
  }, [loadHtml, attempt]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const style = getComputedStyle(viewport);
      setAvailableWidth(Math.max(1, viewport.clientWidth - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0')));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !dialogRef.current || !isTopmostDialog(dialogRef.current, event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      closeRef.current();
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', escape);
      frameCleanupRef.current?.();
    };
  }, []);

  const handleLoad = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!doc?.body) return;
    frameCleanupRef.current?.();
    const measure = () => {
      const style = doc.defaultView?.getComputedStyle(doc.body);
      setDocumentSize({
        width: Math.max(DOCUMENT_WIDTH, doc.body.scrollWidth, doc.documentElement.scrollWidth),
        height: Math.max(1, Math.ceil(doc.body.getBoundingClientRect().height + parseFloat(style?.marginTop || '0') + parseFloat(style?.marginBottom || '0'))),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(doc.body);
    // Keyboard events inside an iframe do not bubble to the parent dialog.
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        viewportRef.current?.focus();
      }
    };
    doc.addEventListener('keydown', keyboard);
    frameCleanupRef.current = () => { observer.disconnect(); doc.removeEventListener('keydown', keyboard); };
    setReady(true);
  }, []);

  return createPortal(
    <div ref={dialogRef} className="print-preview-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <div className="print-preview-dialog__header">
        <h2 id={titleId}>{title}</h2>
        <div className="print-preview-dialog__actions">
          <button type="button" className="btn btn--primary btn--sm" disabled={!ready} onClick={() => iframeRef.current?.contentWindow?.print()}>
            <Printer size={16} aria-hidden="true" /> In / Lưu PDF
          </button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng bản xem trước">
            <X size={16} aria-hidden="true" /> Đóng
          </button>
        </div>
      </div>
      <DocumentZoomControls percent={percent} fitActive={zoom === 'fit'} disabled={!ready} onZoomChange={setZoom} onFitWidth={() => setZoom('fit')} />
      <div ref={viewportRef} className="print-preview-dialog__viewport" tabIndex={0} role="region" aria-label="Nội dung bản xem trước">
        {error ? <div className="print-preview-dialog__message" role="alert">
          <p>Không thể tải bản xem trước. Vui lòng thử lại.</p>
          <button type="button" className="btn btn--secondary" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>
        </div> : <>
          {!ready && <div className="print-preview-dialog__message" role="status"><Loader2 size={20} className="spin" /> Đang tải bản xem trước…</div>}
          {html !== null && <div className="print-preview-dialog__canvas" style={{ width: documentSize.width * scale, height: documentSize.height * scale, visibility: ready ? 'visible' : 'hidden' }}>
            <iframe
              ref={iframeRef}
              title={title}
              srcDoc={html}
              sandbox="allow-same-origin allow-modals"
              tabIndex={-1}
              onLoad={handleLoad}
              style={{ width: documentSize.width, height: documentSize.height, transform: `scale(${scale})` }}
            />
          </div>}
        </>}
      </div>
      <p className="print-preview-dialog__hint">Chọn “Lưu dưới dạng PDF” trong hộp thoại in để tải PDF.</p>
    </div>,
    document.body,
  );
}
