import { Router, Request, Response } from 'express';
import { analyzeSinglePlan, comparePlans, explainNode } from '../services/llmService';
import { extractPlanMetrics } from '../utils/planParser';

const router = Router();

// Analyze single query plan
router.post('/single', async (req: Request, res: Response) => {
  try {
    const { planJson } = req.body;

    if (!planJson) {
      return res.status(400).json({ error: 'planJson is required' });
    }

    // Parse and validate JSON
    let parsedPlan;
    try {
      parsedPlan = typeof planJson === 'string' ? JSON.parse(planJson) : planJson;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JSON format' });
    }

    // Extract metrics
    const metrics = extractPlanMetrics(parsedPlan);

    // Get LLM analysis
    const llmAnalysis = await analyzeSinglePlan(parsedPlan);

    res.json({
      metrics,
      plan: parsedPlan,
      analysis: llmAnalysis,
    });
  } catch (error: any) {
    console.error('Error analyzing single plan:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze query plan' });
  }
});

// Compare two query plans
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { planA, planB } = req.body;

    if (!planA || !planB) {
      return res.status(400).json({ error: 'Both planA and planB are required' });
    }

    // Parse and validate JSONs
    let parsedPlanA, parsedPlanB;
    try {
      parsedPlanA = typeof planA === 'string' ? JSON.parse(planA) : planA;
      parsedPlanB = typeof planB === 'string' ? JSON.parse(planB) : planB;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JSON format' });
    }

    // Extract metrics for both plans
    const metricsA = extractPlanMetrics(parsedPlanA);
    const metricsB = extractPlanMetrics(parsedPlanB);

    // Get LLM comparison
    const comparison = await comparePlans(parsedPlanA, parsedPlanB, metricsA, metricsB);

    res.json({
      planA: {
        metrics: metricsA,
        plan: parsedPlanA,
      },
      planB: {
        metrics: metricsB,
        plan: parsedPlanB,
      },
      comparison,
    });
  } catch (error: any) {
    console.error('Error comparing plans:', error);
    res.status(500).json({ error: error.message || 'Failed to compare query plans' });
  }
});

// Explain a specific node type
router.post('/explain-node', async (req: Request, res: Response) => {
  try {
    const { nodeType } = req.body;

    if (!nodeType) {
      return res.status(400).json({ error: 'nodeType is required' });
    }

    const explanation = await explainNode(nodeType);

    res.json({ explanation });
  } catch (error: any) {
    console.error('Error explaining node:', error);
    res.status(500).json({ error: error.message || 'Failed to explain node' });
  }
});

export default router;
