import React from 'react';
import { Panel } from '../../../components/UI';
import { styles } from '../utils';
import type { RenewalReminder } from '@tingting/shared';

interface RenewalWidgetProps {
  renewalReminders: RenewalReminder[];
}

export function RenewalWidget({ renewalReminders }: RenewalWidgetProps) {
  if (renewalReminders.length === 0) return null;

  return (
    <Panel
      title="Nhắc gia hạn"
      subtitle={`${renewalReminders.length} hạng mục sắp hoặc đã quá hạn`}
      style={styles.mb16}
      flush
    >
      <table style={{ width: '100%', minWidth: 0, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '28%' }} />
          <col style={{ width: '32%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Phương tiện</th>
            <th>Hạng mục</th>
            <th className="num">Hạn hiệu lực</th>
            <th className="num">Còn lại</th>
          </tr>
        </thead>
        <tbody>
          {renewalReminders.map((r) => {
            const isOverdue = r.daysRemaining < 0;
            const isWarning = !isOverdue && r.daysRemaining <= (r.reminderLeadDays || 30);
            return (
              <tr key={r.id}>
                <td style={styles.bold}>{r.truckPlate || '—'}</td>
                <td>{r.categoryName}</td>
                <td className="num">{new Date(r.validTo).toLocaleDateString('vi-VN')}</td>
                <td className="num">
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    background: isOverdue ? 'var(--danger-soft, #fef2f2)' : isWarning ? '#fef9c3' : 'transparent',
                    color: isOverdue ? 'var(--danger)' : isWarning ? '#a16207' : 'var(--fg-2)',
                  }}>
                    {isOverdue ? `Quá hạn ${Math.abs(r.daysRemaining)} ngày` : `${r.daysRemaining} ngày`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
