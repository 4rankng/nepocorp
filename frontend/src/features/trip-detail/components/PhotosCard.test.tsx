import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PhotosCard } from './PhotosCard';

/**
 * The trip-detail payload hands this card `/api/photos/…` URLs. When the
 * referenced file is gone the route answers 404 and the browser fires `error`
 * on the <img>; the card must then swap in the explicit Vietnamese placeholder
 * instead of leaving the default broken-image glyph on screen.
 */
describe('PhotosCard', () => {
  it('renders an <img> for a served /api/photos URL', () => {
    render(<PhotosCard photoUrls={['/api/photos/trips%2F375%2Fother-abc.jpg']} />);

    const img = screen.getByAltText('Ảnh 1') as HTMLImageElement;
    expect(img.getAttribute('src')).toContain('/api/photos/trips%2F375%2Fother-abc.jpg');
    expect(screen.queryByText('Không tải được ảnh')).toBeNull();
  });

  it('normalises a bare storage key into a served /api/photos URL', () => {
    render(<PhotosCard photoUrls={['trips/375/other-abc.jpg']} />);

    const img = screen.getByAltText('Ảnh 1') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/api/photos/trips%2F375%2Fother-abc.jpg');
  });

  it('replaces a failed photo with the explicit missing-file placeholder', () => {
    render(<PhotosCard photoUrls={['/api/photos/trips%2F375%2Fother-abc.jpg']} />);

    fireEvent.error(screen.getByAltText('Ảnh 1'));

    expect(screen.getByText('Không tải được ảnh')).toBeTruthy();
    expect(screen.getByText('Ảnh có thể đã bị xoá hoặc không còn trên máy chủ')).toBeTruthy();
    expect(screen.queryByAltText('Ảnh 1')).toBeNull();
  });

  it('renders nothing when the trip has no general photos', () => {
    const { container } = render(<PhotosCard photoUrls={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
