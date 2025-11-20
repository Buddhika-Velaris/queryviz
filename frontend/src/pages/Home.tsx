import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          Welcome to <span className="text-blue-600">QueryViz</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Transform PostgreSQL EXPLAIN plans into actionable insights. Analyze query performance, identify bottlenecks, and optimize with confidence.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            to="/analyze"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Analyze Query
          </Link>
          <Link
            to="/compare"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Compare Plans
          </Link>
        </div>
      </div>

      <div className="mt-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Features</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Visual Plan Tree</h3>
            <p className="text-gray-600">
              Interactive, color-coded visualization of your execution plan with hierarchical node relationships.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-3xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Analysis</h3>
            <p className="text-gray-600">
              Get expert-level insights and optimization recommendations powered by OpenAI.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-3xl mb-4">⚖️</div>
            <h3 className="text-xl font-semibold mb-2">Side-by-Side Comparison</h3>
            <p className="text-gray-600">
              Compare two query plans to understand performance differences and validate optimizations.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-20 bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Use</h2>
        <ol className="list-decimal list-inside space-y-3 text-gray-700">
          <li>Run your PostgreSQL query with: <code className="bg-gray-100 px-2 py-1 rounded">EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)</code></li>
          <li>Copy the JSON output from your database client</li>
          <li>Paste it into QueryViz's analysis or comparison tool</li>
          <li>Get instant performance insights and optimization recommendations</li>
        </ol>
      </div>
    </div>
  );
}
