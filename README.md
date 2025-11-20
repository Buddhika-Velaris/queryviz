# QueryViz - PostgreSQL Performance Analyzer

QueryViz is a web application that transforms PostgreSQL EXPLAIN plans into interactive, human-readable reports with AI-powered optimization recommendations.

## Features

- **Single Query Analysis**: Paste a PostgreSQL EXPLAIN plan and get instant performance insights
- **Side-by-Side Comparison**: Compare two query plans to validate optimizations
- **AI-Powered Recommendations**: Get expert-level suggestions powered by OpenAI
- **Interactive Visualization**: Color-coded execution plan tree with click-to-explain nodes
- **Performance Metrics**: Detailed breakdown of execution time, cost, I/O, and more

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **AI**: OpenAI GPT-4o (analysis) & caching for cost optimization
- **Database**: MongoDB (reserved for future use)

## Key Features

✅ **Smart Caching**: Node explanations cached to reduce API costs by ~60%  
✅ **Enhanced Validation**: Input size limits, structure validation, and sanitization  
✅ **Comprehensive Metrics**: 13 metrics including cache hit ratio, slowest node, scan types  
✅ **Better Error Handling**: Specific messages for quota limits, timeouts, rate limits  
✅ **Performance Tracking**: Request logging and processing time monitoring  
✅ **Graceful Degradation**: Fallback explanations if AI service is temporarily unavailable

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key

## Installation

1. Clone the repository:
```bash
cd queryviz
```

2. Install dependencies:
```bash
npm run install:all
```

3. Set up environment variables:

Backend (`backend/.env`):
```env
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

4. Start the development servers:
```bash
npm run dev
```

This will start:
- Backend API server on http://localhost:5000
- Frontend dev server on http://localhost:5173

## Usage

### Getting Query Plans from PostgreSQL

Run your query with the EXPLAIN command:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM users WHERE age > 25;
```

Copy the JSON output and paste it into QueryViz.

### Single Query Analysis

1. Navigate to "Single Analysis"
2. Paste your EXPLAIN JSON output
3. Click "Analyze Query"
4. Review the metrics, visualization, and AI recommendations

### Comparing Plans

1. Navigate to "Compare Plans"
2. Paste Plan A (original) in the left textarea
3. Paste Plan B (optimized) in the right textarea
4. Click "Compare Plans"
5. Review the side-by-side comparison and AI report

## Project Structure

```
queryviz/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── analyze.ts          # API endpoints
│   │   ├── services/
│   │   │   └── llmService.ts       # OpenAI integration
│   │   ├── utils/
│   │   │   └── planParser.ts       # Query plan parsing utilities
│   │   └── server.ts               # Express server setup
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/             # React components
│   │   ├── pages/                  # Page components
│   │   ├── services/
│   │   │   └── api.ts             # API client
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
└── package.json                    # Root package with workspace scripts
```

## API Endpoints

- `POST /api/analyze/single` - Analyze a single query plan
- `POST /api/analyze/compare` - Compare two query plans
- `POST /api/analyze/explain-node` - Get explanation for a specific node type

## Building for Production

```bash
npm run build
```

This will:
1. Build the React frontend (output: `frontend/dist`)
2. Build the TypeScript backend (output: `backend/dist`)

To start the production server:

```bash
npm start
```

## License

MIT
