import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyIllustration } from './EmptyIllustration';

describe('EmptyIllustration', () => {
  it('renders a decorative resolved illustration for a legacy name', () => {
    render(<EmptyIllustration name="empty-trucks" />);
    const img = screen.getByAltText('');
    expect(img.getAttribute('src')).toBe('/assets/illustrations/empty-flat-fleet.svg');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies inline width/height sizing when passed', () => {
    render(<EmptyIllustration name="finance" width={120} height={96} />);
    const img = screen.getByAltText('');
    expect(img.style.width).toBe('120px');
    expect(img.style.height).toBe('96px');
    expect(img.style.objectFit).toBe('contain');
  });

  it('keeps the unknown-input passthrough so custom art paths keep working', () => {
    render(<EmptyIllustration name="/img/custom.png" />);
    expect(screen.getByAltText('').getAttribute('src')).toBe('/img/custom.png');
  });

  it('forwards className and style to the img element', () => {
    render(<EmptyIllustration name="ops" className="w-full" style={{ opacity: 0.5 }} />);
    const img = screen.getByAltText('');
    expect(img.className).toContain('w-full');
    expect(img.style.opacity).toBe('0.5');
  });

  it('hides itself if the asset fails to load', () => {
    render(<EmptyIllustration name="/img/custom.png" />);
    const img = screen.getByAltText('');
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });
});
