// NEPO-40 (id 663) — /trips header + tab strip layout contract (shipmate-uiux:
// no-overlap + no-truncate). Tab strip wrap 2 dòng thay vì cắt "Đã hủy" thành
// "Đã ỉ"; khối thống kê không wrap từng chữ khi bị bóp @768; nhãn data-grid
// trong card truncate có chủ đích 1 dòng + title, không wrap 2–3 dòng ngắt quãng.
import listFilterCss from '../components/shared/ListFilterBar.css?raw';
import tableCss from './trip-list/table.css?raw';
import tripsResponsiveCss from './trip-list/responsive.css?raw';
import mobileCardsCss from './trip-list/mobile-cards.css?raw';
import { describe, expect, it } from 'vitest';

// Tách rule body theo '}' — file CSS không lồng ngoài @media.
function rules(css: string): Array<{ selector: string; body: string }> {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').flatMap((chunk) => {
    const at = chunk.lastIndexOf('{');
    if (at === -1) return [];
    return [{ selector: chunk.slice(0, at).trim(), body: chunk.slice(at + 1) }];
  });
}

describe('/trips header + tabs never clip (NEPO-40)', () => {
  it('status tab strip wraps ≤1023px instead of clipping the last tab', () => {
    const wrapRule = rules(listFilterCss)
      .find((r) => r.selector.includes('(max-width: 1023px)') && r.selector.includes('.list-filter-options'));
    expect(wrapRule, 'list-filter-options wrap override ≤1023px missing').toBeTruthy();
    expect(wrapRule!.body).toMatch(/flex-wrap:\s*wrap/);
  });

  it('hero stats phrases stay whole — wrap between phrases, never mid-phrase', () => {
    const subRule = rules(tableCss).find((r) => r.selector.endsWith('.thc-sub span'));
    expect(subRule, 'thc-sub span nowrap rule missing').toBeTruthy();
    expect(subRule!.body).toMatch(/white-space:\s*nowrap/);
  });

  it('hero stats own full row ≤1023px so title/actions cannot crush it', () => {
    const rowRule = rules(tripsResponsiveCss)
      .find((r) => r.selector.includes('(max-width: 1023px)') && r.selector.includes('.thc-sub'));
    expect(rowRule, 'thc-sub full-row rule ≤1023px missing').toBeTruthy();
    expect(rowRule!.body).toMatch(/flex:\s*1 1 100%/);
  });

  it('card data-grid labels truncate deliberately on one line ≤1023px', () => {
    const labRule = rules(mobileCardsCss)
      .find((r) => r.selector.includes('(max-width: 1023px)') && r.selector.includes('.lab'));
    expect(labRule, '.lab truncate rule ≤1023px missing').toBeTruthy();
    expect(labRule!.body).toMatch(/white-space:\s*nowrap/);
    expect(labRule!.body).toMatch(/text-overflow:\s*ellipsis/);
  });
});
