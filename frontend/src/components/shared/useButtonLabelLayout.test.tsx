import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncButtonLabelLayout, useButtonLabelLayout } from './useButtonLabelLayout';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.querySelectorAll('[data-button-fixture]').forEach(node => node.remove());
});

function buttonFixture(icon = '<svg aria-hidden="true"></svg>') {
  const button = document.createElement('button');
  button.dataset.buttonFixture = '';
  button.className = 'btn';
  button.innerHTML = `${icon}<span>Tạo báo cáo vận chuyển</span>`;
  document.body.append(button);
  return button;
}

function mockLabelLines(shouldWrap: () => boolean) {
  vi.spyOn(document, 'createRange').mockImplementation(() => {
    let button: HTMLElement | null;
    return {
      selectNodeContents: (node: Node) => { button = node.parentElement?.closest('.btn') ?? null; },
      getClientRects: () => {
        const lines = [new DOMRect(0, 0, 80, 18)];
        if (shouldWrap() && !button?.hasAttribute('data-button-label-wrap')) lines.push(new DOMRect(0, 20, 50, 18));
        return lines;
      },
    } as unknown as Range;
  });
}

describe('shared button label layout', () => {
  it('hides decorative icons only while the complete original content wraps', () => {
    let narrow = true;
    mockLabelLines(() => narrow);
    const button = buttonFixture();
    syncButtonLabelLayout(button);
    expect(button.getAttribute('data-button-label-wrap')).toBe('true');
    expect(button.querySelector('svg')?.hasAttribute('data-button-decoration')).toBe(true);
    // Hiding the icon makes the rendered label fit; repeated measurement must
    // still evaluate the complete content instead of oscillating.
    syncButtonLabelLayout(button);
    expect(button.getAttribute('data-button-label-wrap')).toBe('true');
    narrow = false;
    syncButtonLabelLayout(button);
    expect(button.hasAttribute('data-button-label-wrap')).toBe(false);
    narrow = true;
    syncButtonLabelLayout(button);
    expect(button.getAttribute('data-button-label-wrap')).toBe('true');
  });

  it.each([
    '<svg aria-hidden="true" class="spin"></svg>',
    '<svg aria-label="Đang xử lý" role="img"></svg>',
    '<img alt="Đã xác minh" />',
  ])('preserves status and meaningful icons: %s', icon => {
    mockLabelLines(() => true);
    const button = buttonFixture(icon);
    syncButtonLabelLayout(button);
    expect(button.querySelector('[data-button-decoration]')).toBeNull();
    expect(button.hasAttribute('data-button-label-wrap')).toBe(false);
  });

  it('keeps decorative icons on single-line and icon-only buttons', () => {
    mockLabelLines(() => false);
    const button = buttonFixture();
    syncButtonLabelLayout(button);
    expect(button.hasAttribute('data-button-label-wrap')).toBe(false);
    button.querySelector('span')?.remove();
    syncButtonLabelLayout(button);
    expect(button.hasAttribute('data-button-label-wrap')).toBe(false);
  });

  it.each(['false', 'true'])('preserves disclosure state indicators while hiding decoration (expanded=%s)', expanded => {
    mockLabelLines(() => true);
    const button = buttonFixture('<svg aria-hidden="true" class="decoration"></svg><svg aria-hidden="true" class="lucide-chevron-down"></svg>');
    button.setAttribute('aria-expanded', expanded);
    syncButtonLabelLayout(button);
    expect(button.getAttribute('data-button-label-wrap')).toBe('true');
    expect(button.querySelector('.decoration')?.hasAttribute('data-button-decoration')).toBe(true);
    expect(button.querySelector('.lucide-chevron-down')?.hasAttribute('data-button-decoration')).toBe(false);
  });

  it('distinguishes a grid title and subtitle from wrapping inside the title', () => {
    let narrow = false;
    vi.spyOn(document, 'createRange').mockImplementation(() => {
      let subtitle = false;
      return {
        selectNodeContents: (node: Node) => { subtitle = node.parentElement?.tagName === 'SMALL'; },
        getClientRects: () => subtitle
          ? [new DOMRect(0, 40, 90, 16), new DOMRect(0, 60, 60, 16)]
          : [new DOMRect(0, 0, 80, 18), ...(narrow ? [new DOMRect(0, 20, 50, 18)] : [])],
      } as unknown as Range;
    });
    const button = buttonFixture();
    button.style.display = 'grid';
    button.querySelector('span')!.style.display = 'block';
    const subtitle = document.createElement('small');
    subtitle.style.display = 'block';
    subtitle.textContent = 'Nhãn, dữ liệu, tổng';
    button.append(subtitle);
    syncButtonLabelLayout(button);
    expect(button.hasAttribute('data-button-label-wrap')).toBe(false);
    narrow = true;
    syncButtonLabelLayout(button);
    expect(button.getAttribute('data-button-label-wrap')).toBe('true');
    narrow = false;
    syncButtonLabelLayout(button);
    expect(button.hasAttribute('data-button-label-wrap')).toBe(false);
  });

  it('hides inline asset icons and restores their original display when space returns', () => {
    let narrow = true;
    mockLabelLines(() => narrow);
    const button = buttonFixture('<img alt="" style="display:inline-block" />');
    const icon = button.querySelector('img')!;
    syncButtonLabelLayout(button);
    expect(icon.style.display).toBe('none');
    narrow = false;
    syncButtonLabelLayout(button);
    expect(icon.style.display).toBe('inline-block');
  });

  it('handles buttons added after mount and cleans up when the shell unmounts', async () => {
    mockLabelLines(() => true);
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    function Shell() { useButtonLabelLayout(); return null; }
    const view = render(<Shell />);
    const button = buttonFixture();
    await waitFor(() => expect(button.getAttribute('data-button-label-wrap')).toBe('true'));
    button.querySelector('svg')!.classList.add('spin');
    await waitFor(() => expect(button.hasAttribute('data-button-label-wrap')).toBe(false));
    expect(button.querySelector('[data-button-decoration]')).toBeNull();
    button.querySelector('svg')!.classList.remove('spin');
    await waitFor(() => expect(button.getAttribute('data-button-label-wrap')).toBe('true'));
    view.unmount();
    expect(button.hasAttribute('data-button-label-wrap')).toBe(false);
    expect(button.querySelector('[data-button-decoration]')).toBeNull();
  });

  it('handles plain action buttons while preserving dropdown and combobox indicators', async () => {
    mockLabelLines(() => true);
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    function Shell() { useButtonLabelLayout(); return null; }
    const view = render(<Shell />);
    const action = buttonFixture();
    action.className = 'template-section';
    const dropdown = buttonFixture();
    dropdown.setAttribute('aria-haspopup', 'listbox');
    const combobox = buttonFixture();
    combobox.setAttribute('role', 'combobox');
    await waitFor(() => expect(action.getAttribute('data-button-label-wrap')).toBe('true'));
    expect(dropdown.querySelector('[data-button-decoration]')).toBeNull();
    expect(combobox.querySelector('[data-button-decoration]')).toBeNull();
    expect(dropdown.hasAttribute('data-button-label-wrap')).toBe(false);
    expect(combobox.hasAttribute('data-button-label-wrap')).toBe(false);
    view.unmount();
  });
});
