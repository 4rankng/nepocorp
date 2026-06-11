import { describe, it, expect } from 'vitest';

describe('Vitest infrastructure', () => {
  it('runs basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBeTruthy();
    expect([1, 2, 3]).toHaveLength(3);
  });

  it('supports jsdom environment', () => {
    // jsdom provides a minimal DOM implementation
    const div = document.createElement('div');
    div.textContent = 'test';
    expect(div.textContent).toBe('test');
  });

  it('supports module resolution via workspace package', async () => {
    // Verify the @tingting/shared workspace package resolves correctly
    const mod = await import('@tingting/shared');
    expect(mod.round2dp).toBeDefined();
  });
});
