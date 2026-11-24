import { Router } from 'express';
import { registerAuditEvent } from '../../services/audit-registry';
import { AuditEvent } from '../../services/audit-types';

import ledgerRoutes from './ledger.routes';
import paymentsRoutes from './payments.routes';
import penaltiesRoutes from './penalties.routes';
import reportsRoutes from './reports.routes';
import advancesRoutes from './advances.routes';
import debtOffsetsRoutes from './debt-offsets.routes';
import billingDocumentsRoutes from './billing-documents.routes';

// Audit event registrations
registerAuditEvent('POST', '/api/payments/receive', AuditEvent.PAYMENT_RECEIVED);
registerAuditEvent('POST', '/api/adjustments', AuditEvent.ADJUSTMENT_CREATED);
registerAuditEvent('POST', '/api/penalties', AuditEvent.PENALTY_CREATED);
registerAuditEvent('POST', '/api/penalties/', '/cancel', AuditEvent.PENALTY_CANCELED);
registerAuditEvent('POST', '/api/payments/vendor', AuditEvent.PAYMENT_RECEIVED);
registerAuditEvent('POST', '/api/payments/carrier', AuditEvent.PAYMENT_RECEIVED);
registerAuditEvent('POST', '/api/reports/distribute-profit', AuditEvent.PROFIT_DISTRIBUTED);
registerAuditEvent('POST', '/api/advance-requests/', '/approve', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/advance-requests/', '/reject', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/advance-settlements/', '/check', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/advance-settlements/', '/approve', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/advance-settlements/', '/reject', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/finance/debt-offsets/', '/approve', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/finance/debt-offsets', AuditEvent.ENTITY_CREATED);
// NEPO-63 Chốt công nợ — closing/reopening a customer's receivable book is
// audit-logged with the customer + the closed-through day (note rides the body).
registerAuditEvent('POST', '/api/finance/customers/', '/close-debt', AuditEvent.DEBT_CLOSED);
registerAuditEvent('POST', '/api/finance/customers/', '/reopen-debt', AuditEvent.DEBT_REOPENED);

const router = Router();

router.use(ledgerRoutes);
router.use(paymentsRoutes);
router.use(penaltiesRoutes);
router.use(reportsRoutes);
router.use(advancesRoutes);
router.use(debtOffsetsRoutes);
router.use(billingDocumentsRoutes);

// Audit: saving a billing document (debit note / payment statement snapshot)
registerAuditEvent('POST', '/api/finance/billing-documents', AuditEvent.ENTITY_CREATED);
// NEPO-63 — Admin edits an ISSUED debit note: the PUT is ADMIN-only and every
// edit lands in the audit log (yêu cầu phân quyền: "Admin sửa Báo nợ có log").
// Suffix mode (4 args): matches PUT /api/finance/billing-documents/:id.
registerAuditEvent('PUT', '/api/finance/billing-documents/', '', AuditEvent.DEBIT_NOTE_UPDATED);
// NEPO-63 — deleting a DRAFT Báo nợ (chưa phát hành, -BS01 included) is
// audit-logged with the document number + amount the route stashes.
registerAuditEvent('DELETE', '/api/finance/billing-documents/', '', AuditEvent.BILLING_DOCUMENT_DELETED);

export default router;
