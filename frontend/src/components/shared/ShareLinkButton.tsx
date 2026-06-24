import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useToast } from './Toast';
import { absoluteUrl } from '../../lib/routes';
import './ShareLinkButton.css';

interface ShareLinkButtonProps {
  /** Shared path. Defaults to the current pathname (clean — no query string). */
  path?: string;
  /** Button label (also the accessible name); hidden under 640px. */
  label?: string;
  className?: string;
}

/**
 * Copies the current page's absolute URL to the clipboard for external sharing
 * (Telegram, email, docs). Uses `window.location.origin` so the link is correct
 * for whichever production domain (nepo / vantai) the sharer is on — no config.
 *
 * By default it shares the clean current pathname (transient params like
 * `?focus=` / `?m=&y=` are stripped). Pass `path` to share a specific route.
 */
export function ShareLinkButton({
  path,
  label = 'Sao chép liên kết',
  className = 'btn btn--ghost btn--sm',
}: ShareLinkButtonProps) {
  const { toast } = useToast();
  const { pathname } = useLocation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = absoluteUrl(path ?? pathname);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ kind: 'success', message: 'Đã sao chép liên kết' });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Permissions denial / lost focus / very old browser. Both prod domains
      // are HTTPS so navigator.clipboard is present; the address bar is a fine
      // manual fallback for the rare failure. No deprecated execCommand shim.
      toast({ kind: 'error', message: 'Không sao chép được. Hãy copy từ thanh địa chỉ.' });
    }
  };

  return (
    <button
      type="button"
      className={`${className} share-link-btn`}
      onClick={handleCopy}
      aria-label={label}
      title={label}
    >
      {copied ? <Check size={14} /> : <Link2 size={14} />}
      <span className="share-link-btn__label">{label}</span>
    </button>
  );
}
