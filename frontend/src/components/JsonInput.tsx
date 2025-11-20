import { useState } from 'react';

interface JsonInputProps {
  onSubmit: (jsonInput: string) => void;
  loading: boolean;
}

export default function JsonInput({ onSubmit, loading }: JsonInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Paste PostgreSQL EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) output:
      </label>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        placeholder='[{"Plan": {...}}]'
        disabled={loading}
      />
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Analyze Query'}
        </button>
      </div>
    </form>
  );
}
