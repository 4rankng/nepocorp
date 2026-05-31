/**
 * CRUD route factory — generates standard REST endpoints for a Drizzle table.
 * Extracted from config.service.ts so route machinery lives with routes.
 *
 * Endpoints: GET / (list), POST / (create), GET /:id, PUT /:id, DELETE /:id.
 * Supports soft-delete (checks for `deletedAt` column) and optional search.
 */
import { Router } from 'express';
import { db } from '../../db';
import { eq, isNull, sql, like, and } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { cacheInvalidate } from '../../lib/redis';

export interface CrudRouterOptions {
  searchableField?: string;
  beforeCreate?: (data: any, req: Request) => Promise<any> | any;
  afterCreate?: (item: any, req: Request) => Promise<void> | void;
  beforeUpdate?: (id: number, data: any, req: Request) => Promise<any> | any;
  afterUpdate?: (item: any, req: Request) => Promise<void> | void;
  beforeDelete?: (id: number, req: Request) => Promise<void> | void;
  afterDelete?: (id: number, req: Request) => Promise<void> | void;
}

export function createCrudRouter(
  table: any,
  createSchema: any,
  options: CrudRouterOptions = {}
) {
  const {
    searchableField,
    beforeCreate,
    afterCreate,
    beforeUpdate,
    afterUpdate,
    beforeDelete,
    afterDelete,
  } = options;
  const sub = Router();
  const hasSoftDelete = 'deletedAt' in table;

  sub.get('/', async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const search = req.query.search as string;

    const conditions = [];
    if (hasSoftDelete) conditions.push(isNull(table.deletedAt));
    if (search && searchableField) {
      // Escape SQL LIKE metacharacters to prevent unintended wildcard expansion
      const escaped = search.replace(/[%_]/g, '\\$&');
      conditions.push(like(table[searchableField], `%${escaped}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db.select().from(table)
      .where(where)
      .limit(limit).offset((page - 1) * limit);

    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(table)
      .where(where);

    res.json({ items, total: Number(countRow?.count ?? 0), page, pageSize: limit });
  });

  sub.post('/', async (req: Request, res: Response) => {
    let data = createSchema.parse(req.body);
    if (beforeCreate) {
      data = (await beforeCreate(data, req)) || data;
    }
    const [item] = await db.insert(table).values(data).returning();
    if (afterCreate) {
      await afterCreate(item, req);
    }
    await cacheInvalidate('catalogs:bootstrap');
    res.status(201).json(item);
  });

  sub.get('/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const conditions = [eq(table.id, id)];
    if (hasSoftDelete) conditions.push(isNull(table.deletedAt));
    const [item] = await db.select().from(table).where(and(...conditions)).limit(1);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(item);
  });

  sub.put('/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    let data = createSchema.partial().parse(req.body);
    if (beforeUpdate) {
      data = (await beforeUpdate(id, data, req)) || data;
    }
    const [item] = await db.update(table).set({ ...data, updatedAt: new Date() }).where(eq(table.id, id)).returning();
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    if (afterUpdate) {
      await afterUpdate(item, req);
    }
    await cacheInvalidate('catalogs:bootstrap');
    res.json(item);
  });

  sub.delete('/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (!hasSoftDelete) return res.status(405).json({ error: 'Không hỗ trợ xóa' });
    if (beforeDelete) {
      await beforeDelete(id, req);
    }
    const [item] = await db.update(table).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(table.id, id)).returning();
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    if (afterDelete) {
      await afterDelete(id, req);
    }
    await cacheInvalidate('catalogs:bootstrap');
    res.json({ ok: true });
  });

  return sub;
}
