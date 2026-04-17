# queryviz (CLI)

Run PostgreSQL `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` locally and send the
plan to QueryViz for AI analysis. Credentials never leave your machine — only
the resulting plan JSON is uploaded.

## Install

```bash
# Global
npm install -g queryviz

# Or zero-install
npx queryviz run "SELECT ..." --db $DATABASE_URL
```

Requires Node 20+.

## Usage

### Run a query

```bash
queryviz run "SELECT * FROM users WHERE email = 'x@y.com'" \
  --db postgres://user:pass@host:5432/db
```

The CLI wraps the query in `BEGIN; EXPLAIN (...) <sql>; ROLLBACK;`, so writes
(`INSERT`, `UPDATE`, `DELETE`) are executed for measurement and then rolled
back.

### From a file or stdin

```bash
queryviz run --file query.sql --db $DATABASE_URL
cat query.sql | queryviz run -f - --db $DATABASE_URL
```

### Save the plan alongside analysis

```bash
queryviz run --file query.sql --db $DATABASE_URL --save plan.json
```

`--save` without a path auto-names the file `queryviz-plan-<timestamp>.json`.

### Skip the upload (air-gapped / review-later)

```bash
queryviz run --file query.sql --db $DATABASE_URL --save plan.json --no-upload
```

Re-analyze later with:

```bash
queryviz upload plan.json
```

### Compare two queries

```bash
queryviz compare -a before.sql -b after.sql --db $DATABASE_URL
# or compare existing plan JSONs
queryviz compare -a plan-a.json -b plan-b.json --from-files
```

## Environment variables

| Variable            | Purpose                                                              |
| ------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`      | Default connection string                                            |
| `QUERYVIZ_API_URL`  | Override the QueryViz API base URL (default `https://queryviz-2.onrender.com`) |

> The hosted backend is on Render's free tier, which spins down after inactivity.
> The first request after a cold period may take 30–60 seconds. Subsequent
> requests are fast. Upgrade the Render plan or self-host to avoid this.

## Development

```bash
cd cli
npm install
npm run dev -- run --file ../query.sql --db $DATABASE_URL
npm run build
```
