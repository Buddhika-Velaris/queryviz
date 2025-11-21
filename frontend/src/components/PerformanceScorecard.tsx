interface PerformanceScorecard {
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
  verdict: string;
  recommendations: string[];
}

interface PerformanceScorecardProps {
  scorecard: PerformanceScorecard;
  label?: string;
}

function ScoreBar({ score, maxScore, label, color }: { score: number; maxScore: number; label: string; color: string }) {
  const percentage = (score / maxScore) * 100;
  
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{score}/{maxScore}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        {/* eslint-disable-next-line react/forbid-dom-props */}
        <div 
          className={`h-3 rounded-full transition-all duration-500 ${color}`}
          data-percentage={percentage}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function PerformanceScorecardComponent({ scorecard, label }: PerformanceScorecardProps) {
  const getScoreColor = (score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTotalScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-300';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-300';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-300';
    return 'text-red-600 bg-red-50 border-red-300';
  };

  const getVerdictEmoji = (verdict: string): string => {
    if (verdict.includes('Excellent')) return '🌟';
    if (verdict.includes('Good')) return '✅';
    if (verdict.includes('Needs')) return '⚠️';
    return '🚨';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200">
      {label && <div className="text-sm font-semibold text-gray-500 mb-3">{label}</div>}
      
      {/* Total Score - Hero Section */}
      <div className={`mb-6 p-6 rounded-lg border-2 text-center ${getTotalScoreColor(scorecard.totalScore)}`}>
        <div className="text-sm font-semibold mb-2 uppercase tracking-wide">Performance Score</div>
        <div className="text-6xl font-bold mb-2">
          {scorecard.totalScore}
          <span className="text-3xl text-gray-600">/{scorecard.maxScore}</span>
        </div>
        <div className="text-lg font-semibold flex items-center justify-center gap-2">
          <span>{getVerdictEmoji(scorecard.verdict)}</span>
          <span>{scorecard.verdict}</span>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Score Breakdown</h3>
        
        <ScoreBar
          score={scorecard.latencyScore.score}
          maxScore={scorecard.latencyScore.maxScore}
          label="⚡ Latency (Query Speed)"
          color={getScoreColor(scorecard.latencyScore.score, scorecard.latencyScore.maxScore)}
        />
        
        <ScoreBar
          score={scorecard.ioEfficiencyScore.score}
          maxScore={scorecard.ioEfficiencyScore.maxScore}
          label="💾 I/O Efficiency (RAM vs Disk)"
          color={getScoreColor(scorecard.ioEfficiencyScore.score, scorecard.ioEfficiencyScore.maxScore)}
        />
        
        <ScoreBar
          score={scorecard.scalabilityScore.score}
          maxScore={scorecard.scalabilityScore.maxScore}
          label="📈 Scalability (Growth Potential)"
          color={getScoreColor(scorecard.scalabilityScore.score, scorecard.scalabilityScore.maxScore)}
        />
      </div>

      {/* Details */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <h3 className="text-md font-bold text-gray-900 mb-3">Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-gray-500 font-medium min-w-[100px]">⚡ Latency:</span>
            <span className="text-gray-700">{scorecard.latencyScore.details}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-500 font-medium min-w-[100px]">💾 I/O:</span>
            <span className="text-gray-700">{scorecard.ioEfficiencyScore.details}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-500 font-medium min-w-[100px]">📈 Scalability:</span>
            <span className="text-gray-700">{scorecard.scalabilityScore.details}</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {scorecard.recommendations && scorecard.recommendations.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-md font-bold text-gray-900 mb-3">💡 Key Recommendations</h3>
          <ul className="space-y-2 text-sm">
            {scorecard.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
