export interface Finding {
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  sql?: string;
}

export interface SingleAnalysis {
  efficiencyScore: number;
  scoreLabel: string;
  executionSummary: string;
  findings: Finding[];
  recommendations: Recommendation[];
  summary: string;
}

export interface PlanMetrics {
  executionTime: number;
  totalCost: number;
  totalRows: number;
  sharedBlocksHit: number;
  sharedBlocksRead: number;
  planningTime?: number;
  sharedBlocksWritten?: number;
  tempBlocksRead?: number;
  tempBlocksWritten?: number;
  slowestNode?: {
    type: string;
    time: number;
    percentage: number;
  };
  cacheHitRatio?: number;
  sequentialScans?: number;
  indexScans?: number;
}

export interface SingleAnalysisResponse {
  metrics: PlanMetrics;
  plan: unknown;
  analysis: SingleAnalysis;
  metadata: {
    processingTime: number;
    timestamp: string;
  };
}

export interface ComparisonResponse {
  planA: { metrics: PlanMetrics; plan: unknown };
  planB: { metrics: PlanMetrics; plan: unknown };
  comparison: unknown;
  improvement: {
    executionTime: string;
    totalCost: string;
    diskReads: string;
  };
  metadata: {
    processingTime: number;
    timestamp: string;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // non-JSON body
    }
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : undefined) ?? `Request failed with status ${response.status}`;
    const details =
      payload && typeof payload === 'object' && 'details' in payload
        ? String((payload as { details: unknown }).details)
        : undefined;
    throw new ApiError(message, response.status, details);
  }

  return payload as T;
}

export function analyzeSingle(
  apiUrl: string,
  planJson: unknown,
): Promise<SingleAnalysisResponse> {
  return postJson<SingleAnalysisResponse>(
    `${apiUrl.replace(/\/+$/, '')}/api/analyze/single`,
    { planJson },
  );
}

export function comparePlans(
  apiUrl: string,
  planA: unknown,
  planB: unknown,
): Promise<ComparisonResponse> {
  return postJson<ComparisonResponse>(
    `${apiUrl.replace(/\/+$/, '')}/api/analyze/compare`,
    { planA, planB },
  );
}
