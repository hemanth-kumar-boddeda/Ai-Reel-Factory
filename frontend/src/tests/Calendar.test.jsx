import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Calendar from '../pages/Calendar';

describe('Calendar Component', () => {
  it('renders without throwing an error', () => {
    expect(() => {
      render(<Calendar />);
    }).not.toThrow();
  });

  it('renders the calendar heading', () => {
    const { getByRole } = render(<Calendar />);
    const heading = getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Calendar');
  });
});
