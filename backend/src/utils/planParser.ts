interface PlanMetrics {
  executionTime: number;
  totalCost: number;
  totalRows: number;
  sharedBlocksHit: number;
  sharedBlocksRead: number;
  planningTime?: number;
  // Enhanced metrics
  sharedBlocksWritten?: number;
  tempBlocksRead?: number;
  tempBlocksWritten?: number;
  peakMemoryUsage?: number;
  slowestNode?: {
    type: string;
    time: number;
    percentage: number;
  };
  cacheHitRatio?: number;
  sequentialScans?: number;
  indexScans?: number;
  // Performance Scorecard
  performanceScore?: PerformanceScorecard;
}

export interface PerformanceScorecard {
  totalScore: number;
  maxScore: number;
  latencyScore: {
    score: number;
    maxScore: number;
    details: string;
  };
  ioEfficiencyScore: {
    score: number;
    maxScore: number;
    cacheHitRatio: number;
    details: string;
  };
  scalabilityScore: {
    score: number;
    maxScore: number;
    details: string;
  };
  accuracyScore: {
    score: number;
    maxScore: number;
    details: string;
  };
  verdict: string;
  recommendations: string[];
}

export function extractPlanMetrics(planJson: any): PlanMetrics {
  // Handle both raw EXPLAIN output and array format
  const plan = Array.isArray(planJson) ? planJson[0] : planJson;
  
  const executionTime = plan['Execution Time'] || plan['Total Cost'] || 0;
  const planningTime = plan['Planning Time'] || 0;
  
  // Extract from the root Plan node
  const rootPlan = plan.Plan || plan;
  
  // Calculate shared blocks
  const sharedBlocksHit = extractSharedBlocksHit(rootPlan);
  const sharedBlocksRead = extractSharedBlocksRead(rootPlan);
  const sharedBlocksWritten = extractSharedBlocksWritten(rootPlan);
  const tempBlocksRead = extractTempBlocksRead(rootPlan);
  const tempBlocksWritten = extractTempBlocksWritten(rootPlan);
  
  // Calculate cache hit ratio
  const totalBlocks = sharedBlocksHit + sharedBlocksRead;
  const cacheHitRatio = totalBlocks > 0 ? (sharedBlocksHit / totalBlocks) * 100 : 0;
  
  // Find slowest node
  const allNodes = flattenPlanTree(rootPlan);
  const slowestNode = allNodes.reduce((slowest, node) => {
    const nodeTime = node.actualTime || 0;
    if (!slowest || nodeTime > slowest.time) {
      return {
        type: node.nodeType || 'Unknown',
        time: nodeTime,
        percentage: executionTime > 0 ? (nodeTime / executionTime) * 100 : 0,
      };
    }
    return slowest;
  }, null as any);
  
  // Count scan types
  const scanCounts = countScanTypes(rootPlan);
  
  const metrics: PlanMetrics = {
    executionTime: parseFloat(executionTime.toString()),
    totalCost: parseFloat((rootPlan['Total Cost'] || 0).toString()),
    totalRows: parseInt((rootPlan['Actual Rows'] || rootPlan['Plan Rows'] || 0).toString(), 10),
    sharedBlocksHit,
    sharedBlocksRead,
    planningTime: parseFloat(planningTime.toString()),
    sharedBlocksWritten,
    tempBlocksRead,
    tempBlocksWritten,
    cacheHitRatio: parseFloat(cacheHitRatio.toFixed(2)),
    slowestNode,
    sequentialScans: scanCounts.sequential,
    indexScans: scanCounts.index,
  };

  // Calculate Performance Scorecard
  metrics.performanceScore = calculatePerformanceScore(metrics, rootPlan);

  return metrics;
}

function extractSharedBlocksHit(node: any): number {
  let total = 0;
  
  if (node['Shared Hit Blocks']) {
    total += parseInt(node['Shared Hit Blocks'].toString(), 10);
  }
  
  if (node.Plans && Array.isArray(node.Plans)) {
    for (const childNode of node.Plans) {
      total += extractSharedBlocksHit(childNode);
    }
  }
  
  return total;
}

function extractSharedBlocksRead(node: any): number {
  let total = 0;
  
  if (node['Shared Read Blocks']) {
    total += parseInt(node['Shared Read Blocks'].toString(), 10);
  }
  
  if (node.Plans && Array.isArray(node.Plans)) {
    for (const childNode of node.Plans) {
      total += extractSharedBlocksRead(childNode);
    }
  }
  
  return total;
}

function extractSharedBlocksWritten(node: any): number {
  let total = 0;
  
  if (node['Shared Written Blocks']) {
    total += parseInt(node['Shared Written Blocks'].toString(), 10);
  }
  
  if (node.Plans && Array.isArray(node.Plans)) {
    for (const childNode of node.Plans) {
      total += extractSharedBlocksWritten(childNode);
    }
  }
  
  return total;
}

function extractTempBlocksRead(node: any): number {
  let total = 0;
  
  if (node['Temp Read Blocks']) {
    total += parseInt(node['Temp Read Blocks'].toString(), 10);
  }
  
  if (node.Plans && Array.isArray(node.Plans)) {
    for (const childNode of node.Plans) {
      total += extractTempBlocksRead(childNode);
    }
  }
  
  return total;
}

function extractTempBlocksWritten(node: any): number {
  let total = 0;
  
  if (node['Temp Written Blocks']) {
    total += parseInt(node['Temp Written Blocks'].toString(), 10);
  }
  
  if (node.Plans && Array.isArray(node.Plans)) {
    for (const childNode of node.Plans) {
      total += extractTempBlocksWritten(childNode);
    }
  }
  
  return total;
}

function countScanTypes(node: any): { sequential: number; index: number } {
  let sequential = 0;
  let index = 0;
  
  const nodeType = node['Node Type'];
  if (nodeType === 'Seq Scan') sequential++;
  if (nodeType?.includes('Index')) index++;
  
  if (node.Plans && Array.isArray(node.Plans)) {
    for (const childNode of node.Plans) {
      const childCounts = countScanTypes(childNode);
      sequential += childCounts.sequential;
      index += childCounts.index;
    }
  }
  
  return { sequential, index };
}

export function flattenPlanTree(node: any, level: number = 0): any[] {
  const nodes: any[] = [];
  
  nodes.push({
    ...node,
    level,
    nodeType: node['Node Type'],
    actualTime: node['Actual Total Time'] || 0,
    actualRows: node['Actual Rows'] || 0,
    planRows: node['Plan Rows'] || 0,
    totalCost: node['Total Cost'] || 0,
  });
  
  if (node.Plans && Array.isArray(node.Plans)) {
    for (const childNode of node.Plans) {
      nodes.push(...flattenPlanTree(childNode, level + 1));
    }
  }
  
  return nodes;
}

function calculatePerformanceScore(metrics: PlanMetrics, rootPlan: any): PerformanceScorecard {
  const allNodes = flattenPlanTree(rootPlan);
  
  // 1. Latency Score (Max 30 points)
  let latencyScore = 0;
  let latencyDetails = '';
  const execTime = metrics.executionTime;
  
  if (execTime < 50) {
    latencyScore = 30;
    latencyDetails = `Execution time ${execTime.toFixed(2)}ms is excellent (< 50ms)`;
  } else if (execTime < 500) {
    latencyScore = 20;
    latencyDetails = `Execution time ${execTime.toFixed(2)}ms is acceptable (50-500ms)`;
  } else if (execTime < 2000) {
    latencyScore = 10;
    latencyDetails = `Execution time ${execTime.toFixed(2)}ms needs review (500ms-2s)`;
  } else {
    latencyScore = 0;
    latencyDetails = `Execution time ${execTime.toFixed(2)}ms is critical (> 2s)`;
  }
  
  // Planning penalty
  if (metrics.planningTime && metrics.planningTime > execTime) {
    latencyScore = Math.max(0, latencyScore - 5);
    latencyDetails += `. Planning overhead (${metrics.planningTime.toFixed(2)}ms > ${execTime.toFixed(2)}ms) deducted 5 pts`;
  }
  
  // 2. I/O Efficiency Score (Max 30 points)
  let ioScore = 0;
  const cacheHitRatio = metrics.cacheHitRatio || 0;
  let ioDetails = '';
  
  if (cacheHitRatio > 99) {
    ioScore = 30;
    ioDetails = `Cache hit ratio ${cacheHitRatio.toFixed(1)}% - mostly RAM (excellent)`;
  } else if (cacheHitRatio >= 90) {
    ioScore = 20;
    ioDetails = `Cache hit ratio ${cacheHitRatio.toFixed(1)}% - acceptable`;
  } else {
    ioScore = 0;
    ioDetails = `Cache hit ratio ${cacheHitRatio.toFixed(1)}% - disk heavy (critical)`;
  }
  
  // 3. Scalability & Indexing Score (Max 25 points)
  let scalabilityScore = 0;
  let scalabilityDetails = '';
  const recommendations: string[] = [];
  
  // Find primary scan node and filtering info
  const seqScans = allNodes.filter(n => n.nodeType === 'Seq Scan');
  const indexScans = allNodes.filter(n => n.nodeType?.includes('Index'));
  
  if (indexScans.length > 0 && seqScans.length === 0) {
    scalabilityScore = 25;
    scalabilityDetails = `Using index scans with efficient filtering`;
  } else if (seqScans.length > 0) {
    // Check table size from rows
    const largestSeqScan = seqScans.reduce((max, node) => 
      (node.actualRows > max.actualRows ? node : max), seqScans[0]);
    
    const totalRows = largestSeqScan.actualRows + (largestSeqScan['Rows Removed by Filter'] || 0);
    
    if (totalRows < 1000) {
      scalabilityScore = 20;
      scalabilityDetails = `Sequential scan on small table (~${totalRows} rows)`;
    } else {
      scalabilityScore = 0;
      scalabilityDetails = `Sequential scan on table with ${totalRows} rows - needs index`;
      recommendations.push(`Add index on filtered columns to avoid sequential scan`);
    }
    
    // Check filtering efficiency
    const rowsRemoved = largestSeqScan['Rows Removed by Filter'] || 0;
    const rowsReturned = largestSeqScan.actualRows || 0;
    const totalScanned = rowsRemoved + rowsReturned;
    
    if (totalScanned > 0 && rowsRemoved / totalScanned > 0.5) {
      scalabilityScore = Math.max(0, scalabilityScore - 10);
      scalabilityDetails += `. High filtering: ${rowsRemoved} of ${totalScanned} rows discarded (${(rowsRemoved/totalScanned*100).toFixed(1)}%)`;
      recommendations.push(`Query filters out ${(rowsRemoved/totalScanned*100).toFixed(0)}% of rows - consider adding selective index`);
    }
  } else {
    scalabilityScore = 15;
    scalabilityDetails = `Mixed access patterns detected`;
  }
  
  // 4. Planner Accuracy Score (Max 15 points)
  let accuracyScore = 0;
  let accuracyDetails = '';
  
  // Check estimation accuracy across all nodes
  const estimationErrors = allNodes
    .filter(n => n.planRows > 0 && n.actualRows >= 0)
    .map(n => ({
      node: n.nodeType,
      estimated: n.planRows,
      actual: n.actualRows,
      ratio: n.planRows > 0 ? n.actualRows / n.planRows : 1,
    }));
  
  if (estimationErrors.length > 0) {
    const maxDeviation = Math.max(...estimationErrors.map(e => 
      Math.max(e.ratio, 1 / e.ratio)
    ));
    
    if (maxDeviation <= 10) {
      accuracyScore = 15;
      accuracyDetails = `Planner estimates accurate (within 10x)`;
    } else if (maxDeviation <= 100) {
      accuracyScore = 5;
      accuracyDetails = `Planner estimates off by ${maxDeviation.toFixed(0)}x - consider ANALYZE`;
      recommendations.push(`Run ANALYZE on tables to update statistics`);
    } else {
      accuracyScore = 0;
      accuracyDetails = `Planner estimates off by ${maxDeviation.toFixed(0)}x - stale statistics`;
      recommendations.push(`Critical: Run ANALYZE immediately - statistics are very stale`);
    }
  } else {
    accuracyScore = 15;
    accuracyDetails = `No estimation data available`;
  }
  
  // Generate verdict
  const totalScore = latencyScore + ioScore + scalabilityScore + accuracyScore;
  let verdict = '';
  
  if (totalScore >= 80) {
    verdict = 'Excellent - Production Ready';
  } else if (totalScore >= 60) {
    verdict = 'Good - Minor Optimizations Possible';
  } else if (totalScore >= 40) {
    verdict = 'Needs Optimization - Performance Issues Present';
  } else {
    verdict = 'Critical - Significant Performance Problems';
  }
  
  // Add I/O recommendations
  if (cacheHitRatio < 90) {
    recommendations.push(`Low cache hit ratio (${cacheHitRatio.toFixed(1)}%) - query reads heavily from disk. Consider increasing shared_buffers or warming cache`);
  }
  
  return {
    totalScore,
    maxScore: 100,
    latencyScore: {
      score: latencyScore,
      maxScore: 30,
      details: latencyDetails,
    },
    ioEfficiencyScore: {
      score: ioScore,
      maxScore: 30,
      cacheHitRatio,
      details: ioDetails,
    },
    scalabilityScore: {
      score: scalabilityScore,
      maxScore: 25,
      details: scalabilityDetails,
    },
    accuracyScore: {
      score: accuracyScore,
      maxScore: 15,
      details: accuracyDetails,
    },
    verdict,
    recommendations: [...new Set(recommendations)], // Remove duplicates
  };
}
