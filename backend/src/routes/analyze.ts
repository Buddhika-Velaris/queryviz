import { Router, Request, Response } from 'express';
import { analyzeSinglePlan, comparePlans, explainNode } from '../services/llmService.js';
import { extractPlanMetrics } from '../utils/planParser.js';

const router = Router();

// Request body interfaces
interface SinglePlanRequest {
  planJson: string | object;
}

interface ComparePlansRequest {
  planA: string | object;
  planB: string | object;
}

interface ExplainNodeRequest {
  nodeType: string;
}

// Validation helpers
function validatePlanStructure(plan: any): boolean {
  // Check if it's a valid PostgreSQL EXPLAIN output
  if (Array.isArray(plan) && plan.length > 0) {
    return plan[0].hasOwnProperty('Plan') || plan[0].hasOwnProperty('Execution Time');
  }
  return plan.hasOwnProperty('Plan') || plan.hasOwnProperty('Execution Time');
}

function sanitizeInput(input: string): string {
  // Limit input size to prevent abuse
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (input.length > maxSize) {
    throw new Error('Input exceeds maximum size of 5MB');
  }
  return input.trim();
}

// Analyze single query plan
router.post('/single', async (req: Request<{}, {}, SinglePlanRequest>, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { planJson } = req.body;

    if (!planJson) {
      return res.status(400).json({ 
        error: 'planJson is required',
        details: 'Please provide a PostgreSQL EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) output'
      });
    }

    // Parse and validate JSON
    let parsedPlan;
    try {
      const jsonString = typeof planJson === 'string' ? sanitizeInput(planJson) : JSON.stringify(planJson);
      parsedPlan = typeof planJson === 'string' ? JSON.parse(jsonString) : planJson;
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid JSON format',
        details: 'Ensure you copied the complete EXPLAIN output including opening and closing brackets'
      });
    }

    // Validate plan structure
    if (!validatePlanStructure(parsedPlan)) {
      return res.status(400).json({ 
        error: 'Invalid query plan structure',
        details: 'This does not appear to be a valid PostgreSQL EXPLAIN output. Use FORMAT JSON option.'
      });
    }

    // Extract metrics
    const metrics = extractPlanMetrics(parsedPlan);

    // Get LLM analysis
    const llmAnalysis = await analyzeSinglePlan(parsedPlan);

    const processingTime = Date.now() - startTime;
    console.log(`[API] Single plan analyzed in ${processingTime}ms`);

    res.json({
      metrics,
      plan: parsedPlan,
      analysis: llmAnalysis,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error analyzing single plan:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze query plan',
      details: error.code || 'internal_error'
    });
  }
});

// Compare two query plans
router.post('/compare', async (req: Request<{}, {}, ComparePlansRequest>, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { planA, planB } = req.body;

    if (!planA || !planB) {
      return res.status(400).json({ 
        error: 'Both planA and planB are required',
        details: 'Provide two PostgreSQL EXPLAIN outputs for comparison'
      });
    }

    // Parse and validate JSONs
    let parsedPlanA, parsedPlanB;
    try {
      const jsonStringA = typeof planA === 'string' ? sanitizeInput(planA) : JSON.stringify(planA);
      const jsonStringB = typeof planB === 'string' ? sanitizeInput(planB) : JSON.stringify(planB);
      parsedPlanA = typeof planA === 'string' ? JSON.parse(jsonStringA) : planA;
      parsedPlanB = typeof planB === 'string' ? JSON.parse(jsonStringB) : planB;
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid JSON format',
        details: 'One or both plans have invalid JSON syntax'
      });
    }

    // Validate both plan structures
    if (!validatePlanStructure(parsedPlanA) || !validatePlanStructure(parsedPlanB)) {
      return res.status(400).json({ 
        error: 'Invalid query plan structure',
        details: 'One or both inputs are not valid PostgreSQL EXPLAIN outputs'
      });
    }

    // Extract metrics for both plans
    const metricsA = extractPlanMetrics(parsedPlanA);
    const metricsB = extractPlanMetrics(parsedPlanB);

    // Calculate improvement percentages
    const improvement = {
      executionTime: ((metricsA.executionTime - metricsB.executionTime) / metricsA.executionTime * 100).toFixed(2),
      totalCost: ((metricsA.totalCost - metricsB.totalCost) / metricsA.totalCost * 100).toFixed(2),
      diskReads: ((metricsA.sharedBlocksRead - metricsB.sharedBlocksRead) / Math.max(metricsA.sharedBlocksRead, 1) * 100).toFixed(2),
    };

    // Get LLM comparison
    const comparison = await comparePlans(parsedPlanA, parsedPlanB, metricsA, metricsB);

    const processingTime = Date.now() - startTime;
    console.log(`[API] Plans compared in ${processingTime}ms. Improvement: ${improvement.executionTime}%`);

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
      improvement,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error comparing plans:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to compare query plans',
      details: error.code || 'internal_error'
    });
  }
});

// Explain a specific node type
router.post('/explain-node', async (req: Request<{}, {}, ExplainNodeRequest>, res: Response) => {
  try {
    const { nodeType } = req.body;

    if (!nodeType || typeof nodeType !== 'string') {
      return res.status(400).json({ 
        error: 'nodeType is required',
        details: 'Provide a valid PostgreSQL node type (e.g., "Seq Scan", "Index Scan")'
      });
    }

    if (nodeType.length > 100) {
      return res.status(400).json({ 
        error: 'nodeType too long',
        details: 'Node type must be less than 100 characters'
      });
    }

    const explanation = await explainNode(nodeType.trim());

    res.json({ 
      explanation,
      nodeType: nodeType.trim(),
      cached: true // Will be set by the service
    });
  } catch (error: any) {
    console.error('Error explaining node:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to explain node',
      details: error.code || 'internal_error'
    });
  }
});

export default router;
