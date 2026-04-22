import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  SingleAnalysisModel,
  PlanComparisonModel,
  SchemaValidationModel,
  QueryGenerationModel,
} from '../models/history.js';
import { isConnected } from '../services/db.js';

const router = Router();

const ALLOWED_TYPES = ['single_analysis', 'comparison', 'schema_validation', 'query_generation'] as const;
type RecordType = (typeof ALLOWED_TYPES)[number];

const MODEL_MAP: Record<RecordType, mongoose.Model<any>> = {
  single_analysis: SingleAnalysisModel,
  comparison: PlanComparisonModel,
  schema_validation: SchemaValidationModel,
  query_generation: QueryGenerationModel,
};

// ─── GET /api/history ─────────────────────────────────────────────────────────
// Cursor-based pagination: ?type=...&limit=20&cursor=<ISO-date>_<id>
// Returns { records, hasMore, nextCursor }

router.get('/', async (req: Request, res: Response) => {
  const userId = req.velarisUser?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (!isConnected()) {
    return res.status(503).json({ error: 'History unavailable — database not connected', records: [] });
  }

  const typeFilter = req.query.type as string | undefined;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
  const cursor = req.query.cursor as string | undefined; // format: "<ISO>_<id>"

  // Parse cursor into { createdAt, _id }
  let cursorDate: Date | null = null;
  let cursorId: string | null = null;
  if (cursor) {
    const sep = cursor.lastIndexOf('_');
    if (sep > 0) {
      cursorDate = new Date(cursor.slice(0, sep));
      cursorId = cursor.slice(sep + 1);
    }
  }

  try {
    const typesToFetch: RecordType[] = typeFilter && ALLOWED_TYPES.includes(typeFilter as RecordType)
      ? [typeFilter as RecordType]
      : [...ALLOWED_TYPES];

    // Per-model: fetch limit+1 so we can detect hasMore after merging
    const perModelLimit = limit + 1;
    const fetches = typesToFetch.map(async (type) => {
      const query: any = { userId };
      if (cursorDate && cursorId) {
        // Records older than cursor (strictly before, or same time with smaller _id)
        query.$or = [
          { createdAt: { $lt: cursorDate } },
          { createdAt: cursorDate, _id: { $lt: cursorId } },
        ];
      }
      const docs = await MODEL_MAP[type]
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(perModelLimit)
        .lean()
        .exec();
      return docs.map((d: any) => ({ ...d, recordType: type }));
    });

    const arrays = await Promise.all(fetches);
    const merged = arrays
      .flat()
      .sort((a: any, b: any) => {
        const dt = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (dt !== 0) return dt;
        return String(b._id).localeCompare(String(a._id));
      });

    const page = merged.slice(0, limit);
    const hasMore = merged.length > limit;
    const last = page[page.length - 1];
    const nextCursor = hasMore && last
      ? `${new Date(last.createdAt).toISOString()}_${last._id}`
      : null;

    res.json({ records: page, hasMore, nextCursor });
  } catch (err: any) {
    console.error('[history] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ─── GET /api/history/:type/:id ───────────────────────────────────────────────

router.get('/:type/:id', async (req: Request, res: Response) => {
  if (!req.velarisUser?.userId) return res.status(401).json({ error: 'Unauthorized' });

  if (!isConnected()) {
    return res.status(503).json({ error: 'History unavailable — database not connected' });
  }

  const { type, id } = req.params;

  if (!ALLOWED_TYPES.includes(type as RecordType)) {
    return res.status(400).json({ error: 'Invalid record type' });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const model = MODEL_MAP[type as RecordType];
    // Shared-link read access: any authenticated @velaris.io user can view by record ID.
    const doc = await model.findById(id).lean().exec();

    if (!doc) return res.status(404).json({ error: 'Record not found' });

    res.json({ record: { ...doc, recordType: type } });
  } catch (err: any) {
    console.error('[history] GET /:type/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// ─── DELETE /api/history/:type/:id ───────────────────────────────────────────

router.delete('/:type/:id', async (req: Request, res: Response) => {
  const userId = req.velarisUser?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (!isConnected()) {
    return res.status(503).json({ error: 'History unavailable — database not connected' });
  }

  const { type, id } = req.params;

  if (!ALLOWED_TYPES.includes(type as RecordType)) {
    return res.status(400).json({ error: 'Invalid record type' });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const model = MODEL_MAP[type as RecordType];
    const result = await model.deleteOne({ _id: id, userId }).exec();

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('[history] DELETE /:type/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

export default router;
