import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getDebitNoteData, buildDebitNoteXlsx } from '../../services/debitNote.service';

const router = Router();

// ─── Debit Note export (XLSX) ─────────────────────────────────────────────────

// GET /api/finance/debit-note/:customerId/export
router.get('/finance/debit-note/:customerId/export', asyncHandler(async (req: Request, res: Response) => {
  const customerId = parseInt(req.params.customerId as string, 10);
  const mode = req.query.mode === 'PER_BATCH' ? 'PER_BATCH' : 'MONTHLY';
  const month = req.query.month ? parseInt(req.query.month as string, 10) : new Date().getMonth() + 1;
  const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
  const tripIdsRaw = req.query.tripIds as string | undefined;
  const tripIds = tripIdsRaw ? tripIdsRaw.split(',').map(Number).filter(n => !isNaN(n)) : undefined;

  const data = await getDebitNoteData(customerId, { mode, month, year, tripIds });
  const buffer = await buildDebitNoteXlsx(data);

  // ASCII fallback for legacy clients; RFC 5987 filename* with UTF-8 for modern clients
  // so Vietnamese diacritics in the customer name don't violate the header's ASCII requirement.
  const friendly = data.customer.name.replace(/[^a-zA-Z0-9À-ỹ\s]/g, '').trim().replace(/\s+/g, '-');
  const asciiFallback = `giay-bao-no-${friendly.replace(/[^\x20-\x7E]/g, '_')}-T${month}-${year}.xlsx`;
  const utf8Encoded = encodeURIComponent(`giay-bao-no-${friendly}-T${month}-${year}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`);
  res.send(buffer);
}));

export default router;
