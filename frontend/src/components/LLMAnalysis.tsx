import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface LLMAnalysisProps {
  analysis: string;
  title: string;
}

export default function LLMAnalysis({ analysis, title }: LLMAnalysisProps) {
  console.log('anaylis', analysis)
  return (
    <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-lg shadow-lg border border-blue-100">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
          <span className="text-white text-xl font-bold">AI</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-3xl font-bold text-gray-900 mb-4 mt-6 pb-2 border-b-2 border-blue-200">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold text-gray-900 mb-3 mt-5 flex items-center">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 flex-shrink-0"></span>
                <span>{children}</span>
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-lg font-semibold text-gray-700 mb-2 mt-3">
                {children}
              </h4>
            ),
            p: ({ children }) => (
              <p className="text-gray-700 mb-3 leading-relaxed">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-gray-700">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-gray-700">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="pl-2">
                {children}
              </li>
            ),
            code: ({ inline, className, children, ...props }: any) => {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : 'text';
              
              return !inline ? (
                <div className="relative my-4 rounded-lg overflow-hidden">
                  {match && (
                    <div className="absolute top-2 right-2 bg-gray-700 text-gray-200 text-xs px-3 py-1 rounded font-mono z-10">
                      {language}
                    </div>
                  )}
                  <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '1.5rem',
                      fontSize: '0.875rem',
                      borderRadius: '0.5rem',
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <div className="my-4">
                {children}
              </div>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 italic text-gray-600 bg-blue-50 rounded-r">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-6 rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-50">
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody className="bg-white divide-y divide-gray-200">
                {children}
              </tbody>
            ),
            tr: ({ children }) => (
              <tr className="hover:bg-gray-50 transition-colors">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-6 py-4 text-sm text-gray-700 whitespace-normal">
                {children}
              </td>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-gray-900">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-gray-600">
                {children}
              </em>
            ),
            a: ({ children, href }) => (
              <a 
                href={href} 
                className="text-blue-600 hover:text-blue-800 underline font-medium" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            hr: () => (
              <hr className="my-8 border-t-2 border-gray-200" />
            ),
          }}
        >
          {analysis}
        </ReactMarkdown>
      </div>
    </div>
  );
}
