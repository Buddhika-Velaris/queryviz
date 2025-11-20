# Deployment Fix - ES Module Resolution

## Problem
Render deployment was failing with the error:
```
Cannot find module '/opt/render/project/src/backend/dist/routes/analyze'
imported from /opt/render/project/src/backend/dist/server.js
```

## Root Cause
The TypeScript configuration was using **incorrect module resolution settings** for Node.js:
- `"module": "ES2022"`
- `"moduleResolution": "bundler"`

The `"bundler"` module resolution is designed for bundlers like Vite/Webpack, **not** for Node.js runtime. This caused the compiled JavaScript to have module imports that couldn't be resolved by Node.js at runtime.

## Solution
Changed `backend/tsconfig.json` to use proper Node.js module resolution:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",           // ✅ Changed from ES2022
    "moduleResolution": "Node16",  // ✅ Changed from bundler
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    // ... other options remain the same
  }
}
```

### Why Node16?
- `Node16` (or `NodeNext`) is the correct module resolution strategy for Node.js with ES modules
- It properly handles `.js` extensions in import statements
- It aligns with Node.js's actual module resolution algorithm
- It works with `"type": "module"` in package.json

## Additional Fixes
1. **Root package.json start script**: Removed inline `NODE_ENV=production` since it's set in render.yaml:
   ```json
   "start": "cd backend && npm start"
   ```

2. **Verified module structure**: All imports already had proper `.js` extensions:
   - ✅ `import analyzeRouter from './routes/analyze.js'`
   - ✅ `import { analyzeSinglePlan } from '../services/llmService.js'`

## Verification
Tested locally on port 5555:
```bash
cd backend
PORT=5555 node dist/server.js
```

✅ Server starts successfully
✅ No module resolution errors
✅ All imports work correctly

## Deployment Checklist
- [x] Fix TypeScript module resolution (`Node16`)
- [x] Rebuild with new configuration
- [x] Test local server startup
- [x] Verify render.yaml configuration
- [x] Ready for Render deployment

## Next Steps
1. Commit these changes to your repository
2. Push to GitHub
3. Deploy to Render - the ES module error should be resolved

## Reference
- TypeScript Module Resolution: https://www.typescriptlang.org/docs/handbook/modules/reference.html#node16-nodenext
- Node.js ES Modules: https://nodejs.org/api/esm.html
