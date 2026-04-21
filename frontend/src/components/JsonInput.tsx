import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface JsonInputProps {
  onSubmit: (jsonInput: string) => void;
  loading: boolean;
  initialValue?: string;
}

export default function JsonInput({ onSubmit, loading, initialValue }: JsonInputProps) {
  const [input, setInput] = useState(initialValue ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) onSubmit(input);
  };

  const ready = !loading && input.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700 bg-gray-800/40">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
        </div>
        <span className="text-xs text-gray-500 font-mono ml-1">
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) output
        </span>
      </div>

      {/* Textarea */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full h-[300px] px-5 py-4 bg-transparent text-gray-300 font-mono text-xs leading-relaxed resize-none focus:outline-none placeholder-gray-700"
        placeholder={'[\n  {\n    "Plan": { ... },\n    "Execution Time": 0.0\n  }\n]'}
        disabled={loading}
        spellCheck={false}
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 bg-gray-800/30">
        <span className="text-xs text-gray-600 tabular-nums">
          {input.length > 0 ? `${input.length.toLocaleString()} chars` : 'Paste your JSON here'}
        </span>

        <button
          type="submit"
          disabled={!ready}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Analyze Query
            </>
          )}
        </button>
      </div>
    </form>
  );
}
