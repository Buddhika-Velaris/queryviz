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
