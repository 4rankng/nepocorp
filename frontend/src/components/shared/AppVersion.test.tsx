import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '@tingting/shared';
import { AppVersion } from './AppVersion';

describe('AppVersion', () => {
  it('renders the single app version with no query provider mounted', () => {
    // The shell (and this test) renders the label with no providers: the version
    // surface must never depend on one.
    const { container } = render(<AppVersion />);
    expect(screen.getByText(`Phiên bản ${APP_VERSION}`)).toBeTruthy();
    expect(container.querySelector('[title]')).toBeNull();
  });
});
