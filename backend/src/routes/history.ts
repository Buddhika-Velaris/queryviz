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
// Returns the last 50 records for the authenticated user across all types
// Optional query param: ?type=single_analysis|comparison|schema_validation|query_generation

router.get('/', async (req: Request, res: Response) => {
  const userId = req.velarisUser?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (!isConnected()) {
    return res.status(503).json({ error: 'History unavailable — database not connected', records: [] });
  }

  const typeFilter = req.query.type as string | undefined;

  try {
    // Determine which models to query
    const typesToFetch: RecordType[] = typeFilter && ALLOWED_TYPES.includes(typeFilter as RecordType)
      ? [typeFilter as RecordType]
      : [...ALLOWED_TYPES];

    // Fetch from each model concurrently, limit 50 per type then merge + sort client-side
    const perModelLimit = 50;
    const fetches = typesToFetch.map(async (type) => {
      const docs = await MODEL_MAP[type]
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(perModelLimit)
        .lean()
        .exec();
      return docs.map((d: any) => ({ ...d, recordType: type }));
    });

    const arrays = await Promise.all(fetches);
    const merged = arrays
      .flat()
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    res.json({ records: merged });
  } catch (err: any) {
    console.error('[history] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ─── GET /api/history/:type/:id ───────────────────────────────────────────────

router.get('/:type/:id', async (req: Request, res: Response) => {
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
    const doc = await model.findOne({ _id: id, userId }).lean().exec();

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
