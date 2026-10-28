// NEPO-34 — the OCR log screen's CSS contracts (mockup: docs/qa/nepo34-ocr-log-mockup.html,
// DESIGN LOCK comment on the ticket). Same scan idiom as
// dispatch-orders-no-truncate.test.ts: comments stripped, rules split on '}'.
import ocrCss from './OcrRequestsPage.css?raw';
import { describe, expect, it } from 'vitest';

const css = ocrCss.replace(/\/\*[\s\S]*?\*\//g, '');

const rules = css.split('}').flatMap((chunk) => {
  const at = chunk.lastIndexOf('{');
  if (at === -1) return [];
  const selector = chunk.slice(0, at);
  const body = chunk.slice(at + 1);
  return [{ selector: selector.trim(), body }];
});

/** Data-cell selectors — values must wrap, never ellipsize or pin to one line. */
const DATA_CELLS = /\b(ocrlog-table td|ocrlog-c-v|ocrlog-json-block|ocrlog-error-block)\b/;

describe('OCR log screen CSS contracts (NEPO-34)', () => {
  it('never truncates: no text-overflow: ellipsis anywhere (No Truncation doctrine)', () => {
    expect(rules.length).toBeGreaterThan(15); // guard: the scan must see real rules
    for (const { selector, body } of rules) {
      expect(body, `ellipsis trong rule: ${selector.slice(-60)}`)
        .not.toMatch(/text-overflow\s*:\s*ellipsis/);
    }
  });

  it('data cells wrap — nowrap is chrome-only (headers/labels/chip/status)', () => {
    for (const { selector, body } of rules) {
      if (DATA_CELLS.test(selector)) {
        expect(body, `nowrap trong ô dữ liệu: ${selector}`).not.toMatch(/white-space\s*:\s*nowrap/);
        expect(body, `ô dữ liệu phải wrap: ${selector}`).toMatch(/white-space\s*:\s*(normal|pre-wrap)/);
      }
    }
  });

  it('keeps the JSON expand block wrapped and scrollable — the full value is reachable', () => {
    const jsonRule = rules.find((r) => /\.ocrlog-json-block\b/.test(r.selector));
    expect(jsonRule?.body).toMatch(/white-space\s*:\s*pre-wrap/);
    expect(jsonRule?.body).toMatch(/word-break\s*:\s*break-word/);
    expect(jsonRule?.body).toMatch(/overflow\s*:\s*auto/);
  });

  it('switches table/cards at exactly 768px (mobile card <768px)', () => {
    expect(css).toMatch(/@media \(max-width: 767\.98px\)/);

    // Below 768px: cards on, table off. At/above: table on, cards off.
    const mediaAt = css.indexOf('@media (max-width: 767.98px)');
    const mediaBody = css.slice(mediaAt, css.indexOf('}', css.indexOf('.ocrlog-reset', mediaAt)));
    expect(mediaBody).toMatch(/\.ocrlog-desktop\s*{\s*display:\s*none/);
    expect(mediaBody).toMatch(/\.ocrlog-mobile\s*{\s*display:\s*flex/);

    const mobileDefault = rules.find((r) => r.selector === '.ocrlog-mobile');
    expect(mobileDefault?.body).toMatch(/display:\s*none/);
  });
});
