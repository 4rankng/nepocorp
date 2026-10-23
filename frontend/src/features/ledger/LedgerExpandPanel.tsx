import { SETTLEMENT_METHOD_LABELS, type LedgerRow } from '@tingting/shared';

/**
 * Per-container cross-check panel for an expanded ledger row — the sheet's
 * "biết chi phí cho số container này nhưng không rõ là vận chuyển cho khách
 * hàng nào" answer: container identifiers, its fee lines, and the customer
 * the trip moved, on one card. Advances / settlements ride trip-level below.
 */
export function LedgerExpandPanel({ row }: { row: LedgerRow }) {
  const hasContainers = row.containers.length > 0;
  return (
    <div className="ledger-expand">
      <div className="ledger-expand__summary">
        <span className="ledger-expand__customer">
          Vận chuyển cho: <strong>{row.customerName ?? `#${row.customerId}`}</strong>
        </span>
        <span className="ledger-expand__meta">
          {row.containerCount != null && <>{row.containerCount} container · </>}
          {row.carrierType === 'EXTERNAL'
            ? `Thuê ngoài: ${row.externalCarrierName ?? '—'}${row.externalFreightCost ? ` · ${Number(row.externalFreightCost).toLocaleString('vi-VN')} ₫` : ''}`
            : `${row.truckPlate ?? 'chưa gán xe'} · ${row.driverName ?? 'chưa gán lái xe'}`}
        </span>
      </div>

      {hasContainers ? (
        <div className="ledger-expand__containers">
          {row.containers.map((container) => (
            <section key={container.id} className="subsection-card ledger-container-card">
              <header className="ledger-container-card__head">
                <span className="ledger-container-card__number">{container.containerNumber ?? 'Chưa có số container'}</span>
                {container.containerTypeCode && <span className="ledger-container-card__type">{container.containerTypeCode}</span>}
                {container.seals.length > 0 && (
                  <span className="ledger-container-card__seals" title="Số seal">Seal: {container.seals.join(', ')}</span>
                )}
                {container.cargoWeightKg != null && (
                  <span className="ledger-container-card__weight">{Number(container.cargoWeightKg).toLocaleString('vi-VN')} kg</span>
                )}
                {container.declarationNumbers.length > 0 && (
                  <span className="ledger-container-card__declaration" title="Số tờ khai">Tờ khai: {container.declarationNumbers.join(', ')}</span>
                )}
              </header>
              {container.expenses.length > 0 ? (
                <table className="ledger-expense-table">
                  <thead>
                    <tr>
                      <th>Loại phí</th>
                      <th>Bán (khách trả)</th>
                      <th>Mua (chi hộ)</th>
                      <th>Hóa đơn</th>
                      <th>Thanh toán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {container.expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.expenseType}</td>
                        <td className="num">{Number(expense.sellAmount) !== 0 ? Number(expense.sellAmount).toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                        <td className="num">{Number(expense.buyAmount) !== 0 ? Number(expense.buyAmount).toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                        <td>{expense.invoiceNumber ?? '—'}</td>
                        <td>{SETTLEMENT_METHOD_LABELS[expense.settlementMethod] ?? expense.settlementMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="ledger-container-card__empty">Chưa có phí cho container này</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <p className="ledger-expand__none">Chưa có container nào cho lệnh này</p>
      )}

      {row.legs.length > 0 && (
        <div className="ledger-expand__legs">
          {row.legs.map((leg) => (
            <span key={leg.id} className="ledger-leg-chip">
              #{leg.sequence} {leg.origin} → {leg.destination} · {leg.km} km · {leg.loadingType === 'HANG' ? 'hàng' : 'vỏ'}
            </span>
          ))}
        </div>
      )}

      {row.settlements.length > 0 && (
        <div className="ledger-expand__settlements">
          {row.settlements.map((settlement) => (
            <div key={settlement.id} className="ledger-settlement-line">
              <strong>{settlement.code}</strong>
              <span>
                Chi hộ {Number(settlement.totalExpenseAmount).toLocaleString('vi-VN')} ₫
                {settlement.refundAmount && Number(settlement.refundAmount) !== 0 && <> · Hoàn {Number(settlement.refundAmount).toLocaleString('vi-VN')} ₫</>}
                {settlement.advances.length > 0 && <> · Tạm ứng {settlement.advances.reduce((s, a) => s + Number(a.amount || 0), 0).toLocaleString('vi-VN')} ₫</>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
