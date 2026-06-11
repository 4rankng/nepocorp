/**
 * Photo URLs are protected behind the JWT, but the `<img>` tag can't send
 * Authorization headers. We attach the token as a query string instead.
 *
 * Security note: putting the JWT in a URL leaks it into nginx access logs,
 * browser history, and Referer headers. This is a known limitation; the
 * long-term fix is server-side signed URLs or cookie-based auth. Keeping
 * the implementation in one place so a future migration is a one-file
 * change.
 */
export function getAuthenticatedPhotoUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/api/photos/') || url.includes('/api/photos/')) {
    const token = localStorage.getItem('token');
    if (token) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}token=${encodeURIComponent(token)}`;
    }
  }
  return url;
}
