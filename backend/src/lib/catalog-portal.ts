import { Role } from '@tingting/shared';

/**
 * Portal trimming for GET /api/catalogs/bootstrap (mounted in routes/config.ts).
 *
 * DRIVER renders no customer or fleet pickers anywhere, so it never receives
 * those catalogs. FORWARDER (Ops biển) owns lô hàng creation (docs/flows/
 * 16-LO_HANG.md §7) and the 'Thêm lô hàng' form picks the customer from this
 * bootstrap, so it keeps the customers list — all non-deleted customers,
 * because a customer without any lô yet must still stay selectable for its
 * first lô (scoping rows to customers-with-lô would make that first lô
 * uncreatable by the role that owns lô creation), and there is no
 * per-forwarder customer sharing table to scope by. Customer fields are
 * trimmed to the bootstrap projection the frontend CatalogData type declares
 * in api/tripClient.ts — no tax/credit/debt-bookkeeping fields. Fleet
 * catalogs (trucks, drivers, routes, …) stay stripped for both roles; the
 * forwarder-facing catalogs (containerTypes, ports, forwarderExpenseTypes)
 * pass through untouched.
 */

/** Customer fields the portal bootstrap exposes — mirrors CatalogData['customers']. */
export interface PortalCustomer {
  id: number;
  name: string;
  shortName: string | null;
  contactPerson: string | null;
  phone: string | null;
  isCarrier: boolean;
  linkedSupplierId: number | null;
}

/** Minimal structural view of the office bootstrap blob this trims. */
export interface BootstrapDataWithCustomers {
  customers: Array<PortalCustomer & Record<string, unknown>>;
}

/** The catalogs no portal role ever receives; every other key passes through. */
const STRIPPED_CATALOG_KEYS = [
  'trucks', 'drivers', 'routes', 'cargoTypes', 'expenseCategories', 'suppliers', 'trailers',
] as const;

export function portalBootstrapCatalog<D extends BootstrapDataWithCustomers>(data: D, role: Role): D {
  const customers: PortalCustomer[] = role === Role.FORWARDER
    ? data.customers.map((c) => ({
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        contactPerson: c.contactPerson,
        phone: c.phone,
        isCarrier: c.isCarrier,
        linkedSupplierId: c.linkedSupplierId,
      }))
    : [];
  const stripped = Object.fromEntries(STRIPPED_CATALOG_KEYS.map((k) => [k, []])) as Record<(typeof STRIPPED_CATALOG_KEYS)[number], never[]>;
  return { ...data, customers, ...stripped } as unknown as D;
}
