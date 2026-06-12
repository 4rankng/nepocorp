import { Router } from 'express';
import { registerAuditEvent } from '../../services/audit-registry';
import { AuditEvent } from '../../services/audit-types';

import ledgerRoutes from './ledger.routes';
import paymentsRoutes from './payments.routes';
import penaltiesRoutes from './penalties.routes';
import reportsRoutes from './reports.routes';
import advancesRoutes from './advances.routes';
import debtOffsetsRoutes from './debt-offsets.routes';
import debitNotesRoutes from './debit-notes.routes';

// Audit event registrations
registerAuditEvent('POST', '/api/payments', AuditEvent.PAYMENT_RECEIVED);
registerAuditEvent('POST', '/api/adjustments', AuditEvent.ADJUSTMENT_CREATED);
registerAuditEvent('POST', '/api/penalties', AuditEvent.PENALTY_CREATED);
registerAuditEvent('POST', '/api/penalties/', '/cancel', AuditEvent.PENALTY_CANCELED);
registerAuditEvent('POST', '/api/payments/vendor', AuditEvent.PAYMENT_RECEIVED);
registerAuditEvent('POST', '/api/reports/distribute-profit', AuditEvent.PROFIT_DISTRIBUTED);
registerAuditEvent('POST', '/api/advance-requests/', '/approve', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/advance-requests/', '/reject', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/advance-settlements/', '/check', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/advance-settlements/', '/approve', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/advance-settlements/', '/reject', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/finance/debt-offsets/', '/approve', AuditEvent.ENTITY_UPDATED);

const router = Router();

router.use(ledgerRoutes);
router.use(paymentsRoutes);
router.use(penaltiesRoutes);
router.use(reportsRoutes);
router.use(advancesRoutes);
router.use(debtOffsetsRoutes);
router.use(debitNotesRoutes);

export default router;
