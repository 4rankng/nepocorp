import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { InsightCard } from './InsightCard';
import type { AgentResponse } from '@tingting/shared';

type InsightCardResponse = Extract<AgentResponse, { type: 'insight_card' }>;

describe('InsightCard', () => {
  it('renders agent table widgets as two-column display records', () => {
    const card: InsightCardResponse = {
      type: 'insight_card',
      title: 'Xe đầu kéo 15C-136.31',
      summary: 'Thông tin xe và lốp đang gắn',
      widgets: [
        {
          type: 'table',
          columns: ['Thông tin', 'Giá trị'],
          rows: [
            ['Biển số', '15C-136.31'],
            ['Trạm kéo', '40FT'],
          ],
        },
        {
          type: 'table',
          columns: ['Serial', 'Vị trí', 'Cỡ'],
          rows: [
            ['295304044', 'Lốp lái đầu kéo', '295/75R22.5'],
            ['295304045', 'Lốp phụ', '295/75R22.5'],
          ],
        },
      ],
    };

    const { container } = render(<InsightCard card={card} />);

    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelectorAll('.agent-field-list .agent-record-field')).toHaveLength(2);
    expect(container.querySelectorAll('.agent-record-card')).toHaveLength(2);
    expect(container.textContent).toContain('Serial');
    expect(container.textContent).toContain('295304044');
    expect(container.textContent).toContain('Lốp phụ');
  });
});
