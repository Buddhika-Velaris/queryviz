import kleur from 'kleur';
import type {
  ComparisonResponse,
  Finding,
  PlanMetrics,
  Recommendation,
  SingleAnalysisResponse,
} from './api.js';

export function renderSingle(response: SingleAnalysisResponse): string {
  const { analysis, metrics } = response;
  const lines: string[] = [];

  lines.push('');
  lines.push(kleur.bold().cyan('QueryViz Analysis'));
  lines.push(kleur.gray('─'.repeat(50)));
  lines.push(scoreLine(analysis.efficiencyScore, analysis.scoreLabel));
  lines.push(metricsLine(metrics));
  lines.push('');

  if (analysis.executionSummary) {
    lines.push(kleur.bold('Summary'));
    lines.push(wrap(analysis.executionSummary, 2));
    lines.push('');
  }

  if (analysis.findings?.length) {
    lines.push(kleur.bold('Findings'));
    for (const finding of analysis.findings) {
      lines.push(renderFinding(finding));
    }
    lines.push('');
  }

  if (analysis.recommendations?.length) {
    lines.push(kleur.bold('Recommendations'));
    for (const rec of analysis.recommendations) {
      lines.push(renderRecommendation(rec));
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function renderComparison(response: ComparisonResponse): string {
  const lines: string[] = [];
  const { improvement, planA, planB } = response;

  lines.push('');
  lines.push(kleur.bold().cyan('QueryViz Comparison'));
  lines.push(kleur.gray('─'.repeat(50)));
  lines.push(
    `${kleur.bold('Plan A:')} ${fmtMs(planA.metrics.executionTime)}  ` +
      kleur.gray(`cost ${fmtNum(planA.metrics.totalCost)}`),
  );
  lines.push(
    `${kleur.bold('Plan B:')} ${fmtMs(planB.metrics.executionTime)}  ` +
      kleur.gray(`cost ${fmtNum(planB.metrics.totalCost)}`),
  );
  lines.push('');

  const execDelta = Number(improvement.executionTime);
  const costDelta = Number(improvement.totalCost);
  lines.push(kleur.bold('Improvement (A → B)'));
  lines.push(`  Execution: ${deltaLabel(execDelta)}`);
  lines.push(`  Cost:      ${deltaLabel(costDelta)}`);
  lines.push('');

  return lines.join('\n');
}

function scoreLine(score: number, label: string): string {
  const color =
    score >= 80 ? kleur.green : score >= 60 ? kleur.yellow : kleur.red;
  return `${kleur.bold('Score:')} ${color(`${score}/100`)} ${kleur.gray(`(${label})`)}`;
}

function metricsLine(metrics: PlanMetrics): string {
  const parts = [
    `exec ${fmtMs(metrics.executionTime)}`,
    `cost ${fmtNum(metrics.totalCost)}`,
    `rows ${fmtNum(metrics.totalRows)}`,
  ];
  if (typeof metrics.cacheHitRatio === 'number') {
    parts.push(`cache ${metrics.cacheHitRatio.toFixed(1)}%`);
  }
  if (metrics.slowestNode) {
    parts.push(
      `slowest ${metrics.slowestNode.type} (${metrics.slowestNode.percentage.toFixed(0)}%)`,
    );
  }
  return kleur.gray(parts.join('  |  '));
}

function renderFinding(finding: Finding): string {
  const icon = severityIcon(finding.severity);
  const title = severityColor(finding.severity)(finding.title);
  return `  ${icon} ${title}\n${wrap(finding.description, 5)}`;
}

function renderRecommendation(rec: Recommendation): string {
  const tag = priorityTag(rec.priority);
  const lines = [`  ${tag} ${kleur.bold(rec.title)}`];
  lines.push(wrap(rec.description, 5));
  if (rec.sql) {
    lines.push('');
    for (const sqlLine of rec.sql.trim().split('\n')) {
      lines.push(`     ${kleur.cyan(sqlLine)}`);
    }
  }
  return lines.join('\n');
}

function severityIcon(severity: Finding['severity']): string {
  switch (severity) {
    case 'critical':
      return kleur.red('✖');
    case 'warning':
      return kleur.yellow('⚠');
    case 'success':
      return kleur.green('✓');
    default:
      return kleur.blue('ℹ');
  }
}

function severityColor(severity: Finding['severity']): (s: string) => string {
  switch (severity) {
    case 'critical':
      return kleur.red;
    case 'warning':
      return kleur.yellow;
    case 'success':
      return kleur.green;
    default:
      return kleur.blue;
  }
}

function priorityTag(priority: Recommendation['priority']): string {
  const label = priority.toUpperCase();
  switch (priority) {
    case 'high':
      return kleur.bgRed().white(` ${label} `);
    case 'medium':
      return kleur.bgYellow().black(` ${label} `);
    default:
      return kleur.bgBlue().white(` ${label} `);
  }
}

function deltaLabel(pct: number): string {
  if (!Number.isFinite(pct)) return kleur.gray('n/a');
  const sign = pct > 0 ? '+' : '';
  const body = `${sign}${pct.toFixed(2)}%`;
  if (pct > 5) return kleur.green(body);
  if (pct < -5) return kleur.red(body);
  return kleur.gray(body);
}

function fmtMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0ms';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(1)}ms`;
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function wrap(text: string, indent: number): string {
  const pad = ' '.repeat(indent);
  return text
    .split('\n')
    .map((line) => `${pad}${line}`)
    .join('\n');
}
