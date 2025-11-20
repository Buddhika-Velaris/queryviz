interface LLMAnalysisProps {
  analysis: string;
  title: string;
}

export default function LLMAnalysis({ analysis, title }: LLMAnalysisProps) {
  // Parse the analysis to identify sections
  const formatAnalysis = (text: string) => {
    // Split by common section markers
    const lines = text.split('\n');
    const formatted: JSX.Element[] = [];
    let currentSection = '';
    let sectionContent: string[] = [];

    lines.forEach((line, index) => {
      // Check if line is a header (contains numbers followed by ., **, or all caps)
      const isHeader = /^(\*\*)?(\d+\.\s|\#\#\s|[A-Z][A-Z\s]+:)/.test(line.trim());
      
      if (isHeader && sectionContent.length > 0) {
        // Push previous section
        formatted.push(
          <div key={`section-${index}`} className="mb-6">
            {currentSection && (
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                {currentSection.replace(/\*\*/g, '')}
              </h3>
            )}
            <div className="pl-4 border-l-2 border-blue-200">
              {sectionContent.map((content, i) => (
                <p key={i} className="text-gray-700 mb-2 leading-relaxed">
                  {content}
                </p>
              ))}
            </div>
          </div>
        );
        sectionContent = [];
      }

      if (isHeader) {
        currentSection = line.replace(/\*\*/g, '').trim();
      } else if (line.trim()) {
        sectionContent.push(line.trim());
      }
    });

    // Push last section
    if (sectionContent.length > 0) {
      formatted.push(
        <div key="last-section" className="mb-6">
          {currentSection && (
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
              {currentSection.replace(/\*\*/g, '')}
            </h3>
          )}
          <div className="pl-4 border-l-2 border-blue-200">
            {sectionContent.map((content, i) => (
              <p key={i} className="text-gray-700 mb-2 leading-relaxed">
                {content}
              </p>
            ))}
          </div>
        </div>
      );
    }

    // If no sections were identified, just display the raw text in a better format
    if (formatted.length === 0) {
      return (
        <div className="space-y-3">
          {lines.filter(l => l.trim()).map((line, i) => (
            <p key={i} className="text-gray-700 leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      );
    }

    return <div>{formatted}</div>;
  };

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-lg shadow-lg border border-blue-100">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
          <span className="text-white text-xl font-bold">AI</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        {formatAnalysis(analysis)}
      </div>
    </div>
  );
}
