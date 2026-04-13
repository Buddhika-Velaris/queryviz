# 🐘 PostgreSQL — The Definitive Learning Guide

> A comprehensive, architect-level reference for mastering PostgreSQL — from foundational data types and constraints through advanced query patterns, performance tuning, security, partitioning, concurrency, and production operations.

This guide was created based on the source **Mastering Postgres** (by Aaron Francis), widely regarded as one of the best PostgreSQL courses.

---

## Table of Contents

1. [Data Integrity & Constraints](#1-data-integrity--constraints)
2. [Time & Date Types](#2-time--date-types)
3. [Numeric & ID Types](#3-numeric--id-types)
4. [String & Text Types](#4-string--text-types)
5. [JSON Types](#5-json-types)
6. [Arrays](#6-arrays)
7. [Range Types](#7-range-types)
8. [Generated Columns](#8-generated-columns)
9. [Full-Text Search](#9-full-text-search)
10. [Composite & Enum Types](#10-composite--enum-types)
11. [Indexes — Theory & Practice](#11-indexes--theory--practice)
12. [EXPLAIN & Query Analysis](#12-explain--query-analysis)
13. [Joins](#13-joins)
14. [Subqueries](#14-subqueries)
15. [Lateral Joins](#15-lateral-joins)
16. [Window Functions](#16-window-functions)
17. [CTEs (Common Table Expressions)](#17-ctes-common-table-expressions)
18. [Transactions & Concurrency Control](#18-transactions--concurrency-control)
19. [Table Partitioning](#19-table-partitioning)
20. [Views & Materialized Views](#20-views--materialized-views)
21. [Stored Procedures & Functions](#21-stored-procedures--functions)
22. [Triggers & Event-Driven Logic](#22-triggers--event-driven-logic)
23. [Roles, Privileges & Row-Level Security](#23-roles-privileges--row-level-security)
24. [Performance Tuning & Configuration](#24-performance-tuning--configuration)
25. [Vacuum, Autovacuum & Bloat Management](#25-vacuum-autovacuum--bloat-management)
26. [Backup, Recovery & Replication](#26-backup-recovery--replication)
27. [Extensions](#27-extensions)
28. [Utility Patterns & Recipes](#28-utility-patterns--recipes)
29. [Quick Reference Cheatsheet](#29-quick-reference-cheatsheet)
30. [Anti-Patterns to Avoid](#30-anti-patterns-to-avoid)

---

## 1. Data Integrity & Constraints

Data integrity is the foundation of a trustworthy database. PostgreSQL offers the richest constraint system of any relational database — use it aggressively.

### 🌍 When You'll Use This in the Real World

- **E-commerce platforms**: Ensure product prices are always positive, stock never goes negative, and every order references a valid customer and product.
- **SaaS applications**: Enforce that email addresses are unique and well-formed at the database level, so even bugs in the application layer can't create duplicate accounts.
- **Booking/reservation systems**: Use `EXCLUDE` constraints to guarantee no two bookings overlap for the same resource — a hotel room, a meeting room, or a doctor's appointment slot.
- **Financial systems**: Named constraints surface clear error messages when a transaction violates rules, making it easier for support teams to diagnose failed operations.

### Constraint Types at a Glance

| Constraint | Purpose | Enforcement Level |
|---|---|---|
| `NOT NULL` | Prevent missing values | Column |
| `UNIQUE` | No duplicate values | Column or multi-column |
| `PRIMARY KEY` | Unique + NOT NULL identifier | Table (one per table) |
| `FOREIGN KEY` | Referential integrity between tables | Column(s) → another table |
| `CHECK` | Arbitrary boolean expression validation | Column or table |
| `EXCLUDE` | Prevent overlapping/conflicting rows | Table (uses GiST/SP-GiST) |
| `DEFAULT` | Auto-fill missing values on insert | Column |

### Best Practices

- Use **check constraints** to enforce data integrity — not business logic. Business logic belongs in the application layer.
- **Avoid using triggers** to enforce business rules — they create hidden side effects and make debugging difficult.
- Use **DOMAIN TYPES** to share constraints across multiple tables and enforce consistency.
- Name your constraints explicitly — auto-generated names are hard to reference in error handling.
- Prefer `DEFERRABLE` foreign keys when you need to insert circular references within a transaction.

```sql
-- Domain type: reusable constraint definition
CREATE DOMAIN positive_price AS NUMERIC CHECK (VALUE > 0);
CREATE DOMAIN email_address AS TEXT
  CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$');

-- Named constraints for readable error messages
CREATE TABLE products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL CONSTRAINT products_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  price positive_price NOT NULL,
  stock INT CONSTRAINT products_stock_non_negative CHECK (stock >= 0),
  sku TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-column CHECK constraint
CREATE TABLE events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  CONSTRAINT events_time_order CHECK (end_time > start_time)
);
```

### Foreign Key Actions

Foreign keys support cascading actions that control what happens when a referenced row is updated or deleted:

```sql
CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- ON DELETE CASCADE:   delete orders when user is deleted
  -- ON DELETE SET NULL:   set user_id to NULL when user is deleted
  -- ON DELETE RESTRICT:   prevent user deletion if orders exist (default)
  -- ON DELETE SET DEFAULT: set user_id to its DEFAULT value
  -- ON UPDATE CASCADE:    propagate user_id changes
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT
);
```

### Deferrable Constraints

Useful for circular references or bulk operations where constraint ordering is difficult:

```sql
CREATE TABLE departments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  head_employee_id BIGINT,
  CONSTRAINT fk_head_emp FOREIGN KEY (head_employee_id)
    REFERENCES employees(id) DEFERRABLE INITIALLY DEFERRED
);

-- Within a transaction, the FK is checked at COMMIT, not per-statement
BEGIN;
  INSERT INTO employees (id, name, dept_id) VALUES (1, 'Alice', 1);
  INSERT INTO departments (id, head_employee_id) VALUES (1, 1);
COMMIT;  -- constraint checked here
```

### Exclude Constraints with `tsrange`

Prevent overlapping time periods — invaluable for booking systems, scheduling, and resource allocation:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- required for combining GiST operators

CREATE TABLE bookings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id INT NOT NULL,
  during TSRANGE NOT NULL,
  EXCLUDE USING GIST (room_id WITH =, during WITH &&)
);

-- This will succeed:
INSERT INTO bookings (room_id, during) VALUES (1, '[2025-01-01 09:00, 2025-01-01 11:00)');

-- This will FAIL — overlaps with the above:
INSERT INTO bookings (room_id, during) VALUES (1, '[2025-01-01 10:00, 2025-01-01 12:00)');
```

### NOT VALID Constraints for Large Tables

Adding a constraint to a huge table can lock it for a long time. Use `NOT VALID` to add the constraint without scanning existing data, then validate separately:

```sql
-- Step 1: Add constraint without full table scan (fast, takes ShareUpdateExclusiveLock)
ALTER TABLE orders ADD CONSTRAINT orders_amount_positive
  CHECK (amount > 0) NOT VALID;

-- Step 2: Validate existing rows (can run concurrently with reads/writes)
ALTER TABLE orders VALIDATE CONSTRAINT orders_amount_positive;
```

---

## 2. Time & Date Types

### 🌍 When You'll Use This in the Real World

- **Global SaaS products**: Your users are in Tokyo, London, and New York. Store everything in UTC and convert at display time — otherwise, a user scheduling a meeting at "3 PM" will confuse people across three continents.
- **E-commerce order tracking**: "Order placed at 2:34 PM" needs to mean the customer's local time, while your internal analytics pipeline needs UTC for consistent aggregation.
- **Recurring events (calendars, cron jobs)**: A weekly standup at "10:00 AM Europe/London" shifts by an hour when DST changes — use named timezones, never raw offsets.
- **Analytics dashboards**: Use `date_trunc()` and `generate_series()` to build gap-free daily/weekly/monthly revenue charts, even for days with zero sales.

### ⏰ Timezone Golden Rule

> **Store as UTC. Convert to the user's timezone at the latest moment possible. Always use named timezones (e.g., `'Asia/Colombo'`) — never use offsets like `'+05:30'` because offsets don't account for DST.**

```sql
-- Always set the server/session default to UTC
SET timezone = 'UTC';

-- Store timestamps in UTC
created_at TIMESTAMPTZ DEFAULT NOW()

-- Convert on retrieval
SELECT created_at AT TIME ZONE 'Asia/Colombo' FROM events;

-- Current time in a specific timezone
SELECT NOW() AT TIME ZONE 'America/New_York';
```

### Timestamp Types

| Type | Storage | Description |
|---|---|---|
| `TIMESTAMP` | 8 bytes | No timezone info — stores exactly what you insert |
| `TIMESTAMPTZ` | 8 bytes | With timezone — stores as UTC internally, converts on display |
| `DATE` | 4 bytes | Calendar date only (no time) |
| `TIME` | 8 bytes | Time of day only (rarely useful without a date) |
| `TIMETZ` | 12 bytes | Time with timezone — **avoid this; it's almost never what you want** |

> ⚠️ **Always use `TIMESTAMPTZ`** unless you explicitly need to store a "wall clock time" that should NOT be converted (e.g., a recurring meeting at "3 PM local time" regardless of timezone).

### INTERVAL — Duration Type

`INTERVAL` stores a **length of time**, not a point in time.

```sql
-- Arithmetic with intervals
SELECT NOW() + INTERVAL '5 days';
SELECT NOW() - INTERVAL '2 hours 30 minutes';

-- Practical: orders placed in the last 7 days
SELECT * FROM orders
WHERE created_at > NOW() - INTERVAL '7 days';

-- Interval arithmetic
SELECT INTERVAL '1 year 2 months' + INTERVAL '3 days 4 hours';

-- Extract components
SELECT EXTRACT(EPOCH FROM INTERVAL '2 hours 30 minutes');  -- 9000 seconds
SELECT EXTRACT(DAY FROM age('2025-12-31', '2025-01-01'));   -- 364
```

> 💡 Think of `TIMESTAMP` as "Nov 2, 2025, 6:00 PM" and `INTERVAL` as "5 days later."

### Date/Time Functions

```sql
-- Age between two dates
SELECT age('2025-06-15', '1990-03-20');  -- '35 years 2 mons 26 days'

-- Truncate to boundary
SELECT date_trunc('month', NOW());       -- first moment of current month
SELECT date_trunc('hour', created_at);   -- truncate to hour

-- Generate a date series (useful for gap-filling reports)
SELECT d::DATE
FROM generate_series('2025-01-01'::DATE, '2025-01-31'::DATE, '1 day'::INTERVAL) AS d;

-- Extract parts
SELECT EXTRACT(DOW FROM NOW());          -- day of week (0=Sunday)
SELECT EXTRACT(EPOCH FROM NOW());        -- Unix timestamp
SELECT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS TZ');  -- formatted string
```

---

## 3. Numeric & ID Types

### 🌍 When You'll Use This in the Real World

- **Payment processing (Stripe, PayPal integrations)**: Store amounts as `NUMERIC(12,2)` or integer cents — never `FLOAT`. A $19.99 charge stored as a float can become $19.989999… and break reconciliation.
- **Public-facing APIs**: Expose UUIDs in URLs (`/api/invoices/a3f8c1d2-...`) instead of sequential IDs. Sequential IDs let competitors guess your total user count and growth rate.
- **Data migration / imports**: Use `GENERATED BY DEFAULT AS IDENTITY` when you need to import records with existing IDs from a legacy system, then switch to `GENERATED ALWAYS` for new records.
- **High-throughput systems**: Use `BIGINT` identities from the start. Basecamp famously hit the 2.1 billion `INTEGER` limit — migrating mid-production is painful.

### Numeric Types Overview

| Type | Storage | Range / Precision | Use Case |
|---|---|---|---|
| `SMALLINT` | 2 bytes | -32,768 to 32,767 | Small counters, flags |
| `INTEGER` | 4 bytes | -2.1B to 2.1B | General purpose |
| `BIGINT` | 8 bytes | -9.2 quintillion to 9.2 quintillion | Large sequences, PKs |
| `NUMERIC(p,s)` | variable | Up to 131,072 digits | Money, exact calculations |
| `REAL` | 4 bytes | 6 decimal digits precision | Scientific approximations |
| `DOUBLE PRECISION` | 8 bytes | 15 decimal digits precision | Scientific approximations |
| `BOOLEAN` | 1 byte | `TRUE` / `FALSE` / `NULL` | Flags, toggles |
| `UUID` | 16 bytes | 128-bit unique identifier | Distributed-safe PKs |

> ⚠️ **Never use `REAL` or `DOUBLE PRECISION` for money or anything requiring exact decimal arithmetic.** Floating-point rounding errors will accumulate. Use `NUMERIC` or integer-cents.

### SERIAL vs BIGSERIAL (Legacy)

```sql
-- SERIAL (up to ~2.1 billion) — AVOID
id SERIAL PRIMARY KEY

-- BIGSERIAL (up to ~9.2 quintillion) — better, but still legacy syntax
id BIGSERIAL PRIMARY KEY
```

> ⚠️ **Always use `BIGSERIAL` over `SERIAL`** to avoid running out of IDs. Basecamp famously ran into this limit.

### IDENTITY Columns — The Modern Standard

```sql
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL
);

-- GENERATED ALWAYS: PostgreSQL manages the value; manual inserts are rejected
-- GENERATED BY DEFAULT: PostgreSQL provides a default but allows manual override
CREATE TABLE imported_data (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  source TEXT
);
```

> `GENERATED ALWAYS AS IDENTITY` is the SQL-standard, recommended way to create auto-incrementing IDs. It is more explicit than SERIAL and prevents accidental manual ID assignment.

### Sequences

Sequences are the underlying mechanism behind SERIAL and IDENTITY:

```sql
-- Create a custom sequence
CREATE SEQUENCE order_number_seq START 1000 INCREMENT BY 1;

-- Use it
SELECT NEXTVAL('order_number_seq');  -- 1000
SELECT NEXTVAL('order_number_seq');  -- 1001
SELECT CURRVAL('order_number_seq');  -- 1001 (last value in this session)

-- Attach to a column
ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT NEXTVAL('order_number_seq');

-- Reset a sequence
ALTER SEQUENCE order_number_seq RESTART WITH 5000;
```

> ⚠️ **Sequences have gaps by design.** If a transaction rolls back, the sequence value is still consumed. Never rely on sequences being gapless.

### UUID — Distributed-Safe Primary Keys

```sql
-- Built-in function (PostgreSQL 13+)
SELECT gen_random_uuid();

-- As a primary key
CREATE TABLE api_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- For PostgreSQL < 13, use the uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT uuid_generate_v4();
```

### 🔐 Security Risk with Auto-Incrementing Keys

Sequential IDs expose information: a competitor can estimate your total record count, growth rate, and activity patterns. Mitigations:

- Use a **public-facing UUID or slug** for APIs; keep the integer ID internal.
- Or use `gen_random_uuid()` as the primary key directly.
- Consider **ULIDs or UUIDv7** (time-ordered UUIDs) if you need sort-by-creation without an extra column — available via extensions.

---

## 4. String & Text Types

### 🌍 When You'll Use This in the Real World

- **User-generated content (blog platforms, forums)**: Use `TEXT` for post bodies — there's no performance benefit to `VARCHAR(255)` in PostgreSQL, and hitting an arbitrary limit frustrates users.
- **Internationalization (i18n)**: Use ICU collations for case-insensitive unique constraints on usernames, so "Alice" and "alice" can't both register.
- **Search features**: Use `STRING_AGG()` to display comma-separated tags in a product listing, or `ILIKE` for quick-and-dirty admin search panels.
- **Data cleaning pipelines**: Use `TRIM()`, `LOWER()`, and regex matching (`~*`) to normalize messy imported data — email addresses with trailing spaces, inconsistent casing, etc.

### Type Comparison

| Type | Max Length | Padding | Use Case |
|---|---|---|---|
| `TEXT` | Unlimited | None | Default choice for strings |
| `VARCHAR(n)` | n characters | None | When an explicit limit is needed |
| `CHAR(n)` | Exactly n characters | Right-padded with spaces | Fixed-width codes (rare) |

> ✅ **Always use `TEXT`** unless you have a specific business reason for a length limit. `TEXT` and `VARCHAR` have identical performance in PostgreSQL — there is no storage or speed difference.

```sql
-- Use TEXT by default
CREATE TABLE articles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL,
  -- If you need a length limit, add a CHECK constraint — more flexible than VARCHAR(n)
  bio TEXT CONSTRAINT bio_max_length CHECK (LENGTH(bio) <= 500)
);
```

### Useful String Functions

```sql
-- Case manipulation
SELECT UPPER('hello'), LOWER('HELLO'), INITCAP('hello world');

-- Trimming and padding
SELECT TRIM('  hello  '), LPAD('42', 5, '0');  -- '00042'

-- Substring and position
SELECT SUBSTRING('PostgreSQL' FROM 1 FOR 8);  -- 'PostgreS'
SELECT POSITION('SQL' IN 'PostgreSQL');        -- 8

-- String aggregation
SELECT department, STRING_AGG(name, ', ' ORDER BY name) AS employees
FROM staff GROUP BY department;

-- Pattern matching
SELECT * FROM users WHERE email ~* '@gmail\.com$';  -- regex, case-insensitive

-- Split to array
SELECT STRING_TO_ARRAY('a,b,c', ',');  -- {a,b,c}

-- Format (safe from SQL injection in dynamic SQL)
SELECT FORMAT('Hello, %s! You have %s items.', 'Alice', 5);
```

### COLLATION — Sorting & Comparison Rules

```sql
-- Case-insensitive column
CREATE TABLE tags (
  name TEXT COLLATE "und-x-icu" UNIQUE
);

-- Per-query collation
SELECT * FROM products ORDER BY name COLLATE "en-US-x-icu";

-- Create a custom collation for case-insensitive uniqueness
CREATE COLLATION case_insensitive (provider = icu, locale = 'und-u-ks-level2', deterministic = false);
```

---

## 5. JSON Types

### 🌍 When You'll Use This in the Real World

- **Event tracking / analytics**: Store raw event payloads as `JSONB` — each event type has different fields, and a rigid schema would require constant migrations. Query with containment operators (`@>`) for flexible filtering.
- **Feature flags & app configuration**: Store per-user feature flags as `JSONB` columns. Update individual keys with `jsonb_set()` without overwriting the entire object.
- **Third-party API response caching**: Store webhook payloads from Stripe, Twilio, or GitHub as `JSONB`. Extract specific fields with `->>`  for reporting without parsing in application code.
- **Multi-tenant settings**: Each tenant has different preferences. A `settings JSONB` column lets you store arbitrary key-value pairs without creating a new column for every possible setting.

### `json` vs `jsonb` — Always Use `jsonb`

| Feature | `json` | `jsonb` |
|---|---|---|
| Storage | Plain text (stored as-is) | Binary (parsed on write) |
| Indexing | ❌ Not indexable | ✅ GIN, B-tree on expressions |
| Query speed | Slower (re-parsed each read) | Faster (pre-parsed) |
| Preserves whitespace / key order | Yes | No |
| Duplicate keys | Kept | Last value wins |
| Equality comparison | ❌ | ✅ |

```sql
CREATE TABLE events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB
);
```

### Querying JSONB

```sql
-- Arrow operators
SELECT payload->'address'              FROM events;  -- Returns JSONB
SELECT payload->>'name'                FROM events;  -- Returns TEXT
SELECT payload->'address'->>'city'     FROM events;  -- Nested TEXT access
SELECT payload#>>'{address,city}'      FROM events;  -- Path-based TEXT access

-- Containment operators (use GIN index)
SELECT * FROM events WHERE payload @> '{"status": "active"}'::JSONB;     -- contains
SELECT * FROM events WHERE payload ?  'email';                            -- has key
SELECT * FROM events WHERE payload ?| ARRAY['email', 'phone'];           -- has any key
SELECT * FROM events WHERE payload ?& ARRAY['email', 'phone'];           -- has all keys

-- Filter by nested value
SELECT * FROM events WHERE payload->>'status' = 'active';

-- JSONB path queries (PostgreSQL 12+)
SELECT * FROM events WHERE payload @? '$.tags[*] ? (@ == "urgent")';
SELECT jsonb_path_query(payload, '$.items[*].price') FROM events;
```

### Updating JSONB

```sql
-- Set a key
UPDATE events SET payload = jsonb_set(payload, '{status}', '"inactive"') WHERE id = 1;

-- Set a nested key (creates intermediate objects)
UPDATE events SET payload = jsonb_set(payload, '{address,zip}', '"10100"', true) WHERE id = 1;

-- Remove a key
UPDATE events SET payload = payload - 'temp_field' WHERE id = 1;

-- Remove a nested key
UPDATE events SET payload = payload #- '{address,old_field}' WHERE id = 1;

-- Merge (concatenate) two JSONB objects
UPDATE events SET payload = payload || '{"priority": "high"}'::JSONB WHERE id = 1;
```

### JSONB Aggregation & Expansion

```sql
-- Build JSONB from query results
SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM users;

-- Expand JSONB array to rows
SELECT * FROM events, jsonb_array_elements(payload->'items') AS item;

-- Expand JSONB object to key-value pairs
SELECT * FROM events, jsonb_each_text(payload->'metadata') AS kv(key, value);

-- Convert JSON array to a recordset
SELECT *
FROM json_to_recordset('[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]')
  AS t(id INT, name TEXT);
```

### Indexing JSONB

```sql
-- B-tree on a specific extracted key (best for equality/range on one field)
CREATE INDEX idx_events_status ON events ((payload->>'status'));

-- GIN on the entire document (best for containment queries: @>, ?, ?|, ?&)
CREATE INDEX idx_events_payload ON events USING GIN (payload);

-- GIN with jsonb_path_ops (smaller index, only supports @> operator)
CREATE INDEX idx_events_payload_path ON events USING GIN (payload jsonb_path_ops);
```

> 💡 **When to use which JSONB index:** Use a B-tree expression index if you always query one specific key. Use a full GIN index if you run ad-hoc queries against many different keys. Use `jsonb_path_ops` GIN if you only need `@>` containment checks — the index is 2-3x smaller.

---

## 6. Arrays

### 🌍 When You'll Use This in the Real World

- **Tagging systems (blog posts, products, tickets)**: Store tags as `TEXT[]` instead of a junction table when you rarely query individual tags — simpler schema, fewer joins.
- **Feature flags per user**: Store enabled features as `TEXT[]` and check with `'beta_feature' = ANY(features)`.
- **Notification preferences**: A user subscribes to `ARRAY['email', 'sms', 'push']` — check overlap with `&&` to decide which channels to use.
- **Search filters**: Pass user-selected filter values as arrays and match with `@>` or `&&`.

PostgreSQL has native array support for any data type.

```sql
CREATE TABLE posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}'
);

-- Insert
INSERT INTO posts (title, tags) VALUES ('My Post', ARRAY['postgresql', 'database', 'sql']);
INSERT INTO posts (title, tags) VALUES ('Alt Syntax', '{go,concurrency}');

-- Contains value (ANY)
SELECT * FROM posts WHERE 'postgresql' = ANY(tags);

-- Array containment operators
SELECT * FROM posts WHERE tags @> ARRAY['sql', 'database'];  -- contains all
SELECT * FROM posts WHERE tags && ARRAY['go', 'rust'];        -- overlaps (has any)
SELECT * FROM posts WHERE NOT tags @> ARRAY['draft'];         -- does not contain

-- Array length
SELECT title, array_length(tags, 1) AS tag_count FROM posts;

-- Append / prepend / remove
UPDATE posts SET tags = array_append(tags, 'new-tag') WHERE id = 1;
UPDATE posts SET tags = array_prepend('first-tag', tags) WHERE id = 1;
UPDATE posts SET tags = array_remove(tags, 'draft') WHERE id = 1;

-- Index a specific element (1-based)
SELECT tags[1] FROM posts;

-- Slicing
SELECT tags[1:2] FROM posts;
```

### Unnesting Arrays

```sql
-- Expand array to rows
WITH post_tags AS (
  SELECT id, UNNEST(tags) AS tag FROM posts
)
SELECT tag, COUNT(*) AS usage_count
FROM post_tags
GROUP BY tag
ORDER BY usage_count DESC;

-- Unnest with ordinality (preserves position)
SELECT id, tag, ordinality
FROM posts, UNNEST(tags) WITH ORDINALITY AS t(tag, ordinality);
```

### Indexing Arrays

```sql
-- GIN index for @>, &&, and = ANY operations
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
```

> ⚠️ **When to use arrays vs. a junction table:** Arrays are great for small, fixed-ish lists (tags, labels, feature flags). If you need to query, aggregate, or join on individual elements frequently — use a normalized junction table instead.

---

## 7. Range Types

### 🌍 When You'll Use This in the Real World

- **Hotel/rental booking systems**: Use `TSTZRANGE` with `EXCLUDE` constraints to make it physically impossible to double-book a room — the database rejects overlapping reservations automatically.
- **Subscription & billing periods**: Store subscription periods as `DATERANGE` and query "which subscriptions are active today?" with `@> CURRENT_DATE`.
- **Versioned pricing / SLA tiers**: A product has different prices over time. Store each price with a `DATERANGE` and use containment to find the price effective on any given date.
- **Employee shift scheduling**: Prevent overlapping shifts for the same employee using exclusion constraints on `(employee_id WITH =, shift_time WITH &&)`.

PostgreSQL has built-in range types — incredibly powerful for scheduling, reservations, versioning, and temporal data.

### Built-In Range Types

| Type | Element Type | Use Case |
|---|---|---|
| `INT4RANGE` | integer | Integer ranges |
| `INT8RANGE` | bigint | Large integer ranges |
| `NUMRANGE` | numeric | Decimal ranges |
| `TSRANGE` | timestamp | Time periods (no timezone) |
| `TSTZRANGE` | timestamptz | Time periods (with timezone) ✅ |
| `DATERANGE` | date | Calendar date periods |

```sql
-- Range literal notation: [inclusive, exclusive)
SELECT '[2025-01-01, 2025-02-01)'::DATERANGE;
SELECT '(0, 100]'::INT4RANGE;  -- exclusive lower, inclusive upper

-- Containment
SELECT '[1,10]'::INT4RANGE @> 5;                    -- true: range contains element
SELECT '[2025-01-01, 2025-12-31]'::DATERANGE @> '2025-06-15'::DATE;  -- true

-- Overlap
SELECT '[1,5]'::INT4RANGE && '[3,8]'::INT4RANGE;    -- true: ranges overlap

-- Intersection and union
SELECT '[1,10]'::INT4RANGE * '[5,15]'::INT4RANGE;   -- [5,10]: intersection
SELECT '[1,5]'::INT4RANGE + '[3,8]'::INT4RANGE;     -- [1,8]: union (must overlap or be adjacent)

-- Extract bounds
SELECT lower('[2025-01-01, 2025-02-01)'::DATERANGE);  -- 2025-01-01
SELECT upper('[2025-01-01, 2025-02-01)'::DATERANGE);  -- 2025-02-01
SELECT isempty('empty'::INT4RANGE);                    -- true
```

### Practical Example: Pricing with Effective Dates

```sql
CREATE TABLE product_prices (
  product_id INT NOT NULL,
  price NUMERIC NOT NULL,
  effective DATERANGE NOT NULL,
  EXCLUDE USING GIST (product_id WITH =, effective WITH &&)
);

-- Find current price
SELECT price FROM product_prices
WHERE product_id = 42 AND effective @> CURRENT_DATE;
```

---

## 8. Generated Columns

### 🌍 When You'll Use This in the Real World

- **E-commerce order totals**: Automatically compute `total_price` from `quantity * unit_price` — no risk of application bugs causing inconsistent totals.
- **Full-text search vectors**: Generate a `TSVECTOR` column from `title` and `body` so it stays in sync without triggers.
- **Display names**: Automatically concatenate `first_name || ' ' || last_name` into a `full_name` column for simpler queries and API responses.
- **Slug generation**: Compute URL-safe slugs from titles (though complex transformations may require triggers instead).

A column whose value is **automatically computed** from other columns in the same row.

```sql
CREATE TABLE orders (
  quantity INT NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Full name from parts
CREATE TABLE contacts (
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', first_name || ' ' || last_name)
  ) STORED
);
```

### Limitations

- Generated columns can only reference columns in the **same row** (no subqueries, no aggregate functions).
- A generated column **cannot reference another generated column**.
- Only `STORED` is supported (PostgreSQL does not yet support `VIRTUAL` generated columns — the value is physically written to disk).
- You cannot write to a generated column directly — `INSERT` and `UPDATE` must omit it.

---

## 9. Full-Text Search

### 🌍 When You'll Use This in the Real World

- **Documentation sites / knowledge bases**: Users search for "deploying containers" and expect to find articles about "container deployment" — FTS handles stemming automatically.
- **E-commerce product search**: Rank results by relevance using `ts_rank()`, with title matches (`weight A`) boosted above description matches (`weight B`).
- **Support ticket search**: Use `websearch_to_tsquery()` so agents can type natural queries like `"login failed" -password` and get relevant results without learning query syntax.
- **Autocomplete with typo tolerance**: Combine FTS for main search with `pg_trgm` similarity for "did you mean…?" suggestions — all within PostgreSQL, no Elasticsearch needed for moderate-scale apps.

### LIKE / ILIKE vs PostgreSQL FTS (TSVECTOR)

| Feature | LIKE / ILIKE | FTS (TSVECTOR) |
|---|---|---|
| **Primary Use** | Simple wildcard matching | Natural language search |
| **Intelligence** | None — `'Run'` ≠ `'running'` | Stemming, stop words, ranking |
| **Index** | B-tree helps `text%` only | GIN or GiST (purpose-built) |
| **Performance** | Very slow with `%term%` | Extremely fast via GIN |
| **Relevance ranking** | None | Built-in with `ts_rank` |
| **Phrase search** | No | Yes — `<->` (adjacent) operator |

### Setting Up Full-Text Search

```sql
-- Option 1: Generated column (auto-updated)
ALTER TABLE articles ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(body, '')), 'B')
  ) STORED;

-- Option 2: Manual column + trigger (more flexible)
ALTER TABLE articles ADD COLUMN search_vector TSVECTOR;
UPDATE articles SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(body, '')), 'B');

-- Create GIN index (essential for performance)
CREATE INDEX idx_articles_fts ON articles USING GIN(search_vector);
```

### Querying with FTS

```sql
-- Basic search
SELECT title FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql & index');

-- Phrase search (words must be adjacent)
SELECT title FROM articles
WHERE search_vector @@ phraseto_tsquery('english', 'full text search');

-- Web-style search (handles AND, OR, NOT, phrases naturally)
SELECT title FROM articles
WHERE search_vector @@ websearch_to_tsquery('english', '"full text" search -spam');

-- Ranked results
SELECT title, ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'postgresql | database') AS query
WHERE search_vector @@ query
ORDER BY rank DESC;

-- Highlighted snippets
SELECT ts_headline('english', body, to_tsquery('english', 'postgresql'),
  'StartSel=<b>, StopSel=</b>, MaxWords=50') AS snippet
FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql');
```

### FTS Weights

Weights (`A`, `B`, `C`, `D`) let you boost fields. Title matches (`A`) rank higher than body matches (`B`):

```sql
-- Default weights: A=1.0, B=0.4, C=0.2, D=0.1
-- Custom weights:
SELECT ts_rank('{0.1, 0.2, 0.4, 1.0}', search_vector, query) AS rank ...
```

> 💡 `'running'` and `'run'` both resolve to the same lexeme `'run'` — this is called **stemming**. PostgreSQL ships dictionaries for many languages.

### Trigram Similarity (pg_trgm) — For Fuzzy & Typo-Tolerant Search

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Similarity score (0 to 1)
SELECT similarity('postgresql', 'postgress');  -- ~0.6

-- Fuzzy search
SELECT * FROM products WHERE name % 'postgress';  -- trigram similarity match

-- GIN trigram index — supports LIKE '%term%' efficiently!
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
SELECT * FROM products WHERE name ILIKE '%search%';  -- now uses the GIN index
```

---

## 10. Composite & Enum Types

### 🌍 When You'll Use This in the Real World

- **Order status workflows**: Define `ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled')` so invalid statuses like `'shippd'` are rejected at the database level.
- **Address fields**: Group street, city, state, zip into a composite type when you always read/write the full address together and don't need to query individual fields.
- **Ticket priority systems**: Enums enforce ordering — `'critical' > 'high' > 'medium' > 'low'` — enabling queries like "show all tickets above medium priority."
- **Lookup tables vs. enums**: If your list of values changes frequently (e.g., product categories that marketing updates monthly), use a lookup table with a foreign key instead of an enum.

### Composite Types

A custom type grouping multiple fields:

```sql
CREATE TYPE address AS (
  street TEXT,
  city   TEXT,
  state  TEXT,
  zip    TEXT
);

CREATE TABLE users (
  id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  home address
);

-- Insert
INSERT INTO users (name, home)
VALUES ('Alice', ROW('123 Main St', 'Colombo', 'WP', '10100'));

-- Query specific fields
SELECT (home).city, (home).zip FROM users;

-- Update a single field within the composite
UPDATE users SET home.zip = '10200' WHERE id = 1;
```

> ⚠️ **Composite types have limitations:** They cannot have constraints, defaults, or indexes on individual fields. For complex structures, a separate normalized table is usually better.

### Enum Types

Enums define a static, ordered set of values:

```sql
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status order_status NOT NULL DEFAULT 'pending'
);

-- Comparison uses the declared order
SELECT * FROM orders WHERE status > 'processing';  -- shipped, delivered, cancelled

-- Add a new value (PostgreSQL 9.1+)
ALTER TYPE order_status ADD VALUE 'returned' AFTER 'delivered';
```

> ⚠️ **Enum trade-offs:** You cannot remove values or reorder them without recreating the type. For frequently changing lists, a lookup table with a foreign key is more flexible.

---

## 11. Indexes — Theory & Practice

### 🌍 When You'll Use This in the Real World

- **Login/authentication**: A B-tree index on `email` turns a user lookup from a full table scan (seconds on millions of rows) into a sub-millisecond operation.
- **Dashboard filters**: Composite indexes on `(tenant_id, created_at)` let multi-tenant apps filter efficiently — the tenant narrows the set, then the date range scans within it.
- **API endpoints with sparse filters**: A partial index on `WHERE status = 'pending'` keeps a tiny, fast index for the 2% of orders that are pending, ignoring the 98% that are completed.
- **IoT / time-series ingestion**: BRIN indexes on `created_at` for append-only sensor data tables — a 100GB table gets a few-MB index instead of a multi-GB B-tree.
- **Autocomplete / fuzzy search**: GIN indexes with `pg_trgm` make `ILIKE '%search%'` fast enough for real-time typeahead on millions of product names.

> **Index choice is determined by your data access patterns, not by the data type.**

An index is a **separate data structure** that maintains a sorted/structured copy of part of your table data, with pointers back to the full rows (heap tuples).

### Index Types

#### B-tree (Default)

The workhorse index. Supports: `=`, `<`, `>`, `<=`, `>=`, `BETWEEN`, `IN`, `IS NULL`, `ORDER BY`, `LIKE 'prefix%'`.

```sql
CREATE INDEX idx_users_email ON users(email);
```

Internal structure: a balanced tree where leaf nodes contain index entries sorted by key value. Lookup is O(log n). PostgreSQL uses B-tree by default because it handles the widest range of operations.

#### Hash Index

Best for **strict equality only** (`=`). Slightly faster than B-tree for pure equality, but supports nothing else.

```sql
CREATE INDEX idx_users_token ON users USING HASH (token);
```

> ⚠️ Hash indexes are WAL-logged and crash-safe since PostgreSQL 10. Before PG10, they were not crash-safe — never use them on older versions.

#### GIN (Generalized Inverted Index)

Best for: multi-valued data — JSONB (`@>`, `?`, `?|`, `?&`), arrays (`@>`, `&&`), full-text search (`@@`), trigrams.

```sql
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX idx_events_payload ON events USING GIN(payload);
CREATE INDEX idx_articles_fts ON articles USING GIN(search_vector);
```

Internal structure: maps each element (array item, JSON key, lexeme) to a list of row IDs that contain it. Fast reads, slower writes (use `fastupdate` + `gin_pending_list_limit` to batch updates).

#### GiST (Generalized Search Tree)

Best for: geometric data, range types, nearest-neighbor searches, exclusion constraints, PostGIS.

```sql
CREATE INDEX idx_bookings_during ON bookings USING GIST(during);
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);
```

#### BRIN (Block Range INdex)

Best for: very large tables where data is physically ordered (e.g., time-series data with append-only inserts).

```sql
-- Ideal for time-series: logs, events, sensor data
CREATE INDEX idx_logs_created_at ON logs USING BRIN(created_at);
```

BRIN stores min/max values per block range (e.g., per 128 pages). Extremely small index size — a BRIN on a 100GB table might be only a few MB. But only works well when the physical order matches the logical order.

#### SP-GiST (Space-Partitioned GiST)

Best for: non-balanced tree structures like quad-trees, k-d trees, radix trees. Used for IP addresses (`inet_ops`), text prefix searches, and geometric partitioning.

```sql
CREATE INDEX idx_ip ON connections USING SPGIST(client_ip);
```

### Composite (Multi-Column) Index

An index on **multiple columns**:

```sql
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
```

> 📏 **Left-to-right, no skipping.** An index on `(A, B, C)` helps queries filtering on `A`, `A+B`, or `A+B+C` — but NOT on `B` or `C` alone.

Column order matters: put the column you filter with `=` first, then the column you filter with ranges or `ORDER BY`.

### Covering Index (INCLUDE)

Includes extra columns in the index — enables **index-only scans** without touching the heap:

```sql
CREATE INDEX idx_orders_covering ON orders(user_id) INCLUDE (total_price, created_at);
```

| | Pro | Con |
|---|---|---|
| Speed | Index-only scan — massive I/O reduction | |
| Size | | Larger index (stores data, not just pointers) |
| Writes | | Slower INSERTs/UPDATEs (must update index) |

> 💡 `INCLUDE` columns are NOT part of the sort order — they're stored in the leaf pages for retrieval only. You cannot search on them.

### Partial Index

Index only a **subset of rows**:

```sql
-- Only index active users
CREATE INDEX idx_active_users ON users(email) WHERE active = TRUE;

-- Only index unprocessed orders
CREATE INDEX idx_pending_orders ON orders(created_at) WHERE status = 'pending';
```

> 💡 Use partial indexes when a column has low cardinality in one direction (e.g., 90% true, 10% false). Indexing the majority is wasteful.

### Functional (Expression) Index

Index the result of a function or expression:

```sql
-- Case-insensitive email search
CREATE INDEX idx_lower_email ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';

-- Index on computed date
CREATE INDEX idx_orders_month ON orders(date_trunc('month', created_at));

-- JSONB field extraction
CREATE INDEX idx_events_type ON events((payload->>'type'));
```

> ⚠️ The query's WHERE clause must match the **exact expression** in the index, or PostgreSQL won't use it.

### Concurrent Index Creation

Creating an index on a large table blocks writes. Use `CONCURRENTLY` to avoid this:

```sql
-- Does NOT block writes (takes longer, requires extra disk space)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

Caveats: cannot be run inside a transaction, takes longer, requires more disk space, and can fail leaving an `INVALID` index that you must drop and retry.

### Index Ordering

```sql
CREATE INDEX idx_orders_date ON orders(created_at DESC NULLS LAST);
```

### Naming Convention

```sql
-- Convention: idx_{table}_{column(s)}
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id_created_at ON orders(user_id, created_at);
```

### ✅ Before Adding Any Index

1. Check existing indexes: `SELECT * FROM pg_indexes WHERE tablename = 'your_table';`
2. Run `EXPLAIN ANALYZE` on the slow query to confirm a sequential scan.
3. After creating the index, re-run `EXPLAIN ANALYZE` to verify it's used.
4. Monitor index usage over time with `pg_stat_user_indexes`.

### Finding Unused Indexes

```sql
SELECT schemaname, tablename, indexname, idx_scan AS times_used, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelid NOT IN (
  SELECT conindid FROM pg_constraint WHERE contype IN ('p', 'u')  -- exclude PK/UNIQUE
)
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 12. EXPLAIN & Query Analysis

### 🌍 When You'll Use This in the Real World

- **Debugging slow API endpoints**: Your `/api/orders` endpoint takes 3 seconds. Run `EXPLAIN (ANALYZE, BUFFERS)` on the underlying query — you'll likely find a sequential scan on a million-row table that needs an index.
- **Post-deployment performance regression**: After a schema migration, queries that used to be fast are now slow. `EXPLAIN` reveals the planner switched from an index scan to a seq scan because statistics are stale — `ANALYZE` fixes it.
- **Optimizing batch jobs**: Your nightly report generation takes 45 minutes. `EXPLAIN` shows `Sort Method: external merge Disk` — increasing `work_mem` moves the sort to memory and cuts it to 5 minutes.
- **Code review for database queries**: Before merging a PR, run `EXPLAIN` on new queries against production-like data to catch missing indexes early.

### Running EXPLAIN

```sql
-- Plan only (does NOT execute the query)
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com';

-- With actual execution stats (EXECUTES the query — use caution with writes!)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM users WHERE email = 'alice@example.com';

-- JSON format (for visualization tools)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT ...;
```

> 📖 **Read the output from bottom to top** — the innermost (bottom) node executes first.

### Key EXPLAIN Nodes

| Node | Meaning | Action |
|---|---|---|
| `Seq Scan` | Full table scan — no index used | Add an index if the table is large |
| `Index Scan` | Uses index, fetches matching rows from heap | Good — index is working |
| `Index Only Scan` | Uses covering index — no heap access | Best — all data comes from the index |
| `Bitmap Heap Scan` | Batch fetch from heap after Bitmap Index Scan | OK for medium selectivity |
| `Hash Join` | Builds hash table of one side, probes with other | Good for equi-joins on large sets |
| `Merge Join` | Merges two sorted inputs | Good when both sides are pre-sorted |
| `Nested Loop` | Row-by-row join | Good for small result sets or indexed lookups |
| `Sort` | In-memory or on-disk sort | Check if `work_mem` is sufficient |
| `Materialize` | Caches a subplan's result | May indicate repeated execution |
| `HashAggregate` / `GroupAggregate` | GROUP BY implementation | HashAggregate = unsorted; GroupAggregate = pre-sorted |

### Reading EXPLAIN Output

```
                                                  QUERY PLAN
--------------------------------------------------------------------------------------------------------------
 Index Scan using idx_users_email on users  (cost=0.42..8.44 rows=1 width=72) (actual time=0.023..0.025 rows=1 loops=1)
   Index Cond: (email = 'alice@example.com'::text)
   Buffers: shared hit=3
 Planning Time: 0.087 ms
 Execution Time: 0.044 ms
```

Key fields:

- **cost=startup..total** — estimated cost in arbitrary units (sequential page reads). Lower is better.
- **rows** — estimated vs. actual row count. Large discrepancies mean stale statistics → run `ANALYZE`.
- **loops** — how many times this node executed.
- **Buffers: shared hit / read** — pages found in cache vs. read from disk.
- **Planning Time** vs. **Execution Time** — if planning time is high, you may have too many partitions or complex views.

### Common Performance Red Flags

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Seq Scan` on large table | Missing index | Create appropriate index |
| Estimated rows ≫ actual rows | Stale statistics | Run `ANALYZE tablename` |
| `Sort Method: external merge` | `work_mem` too low | Increase `work_mem` |
| `Nested Loop` with high loops | Missing index on inner table | Add index on join column |
| `Bitmap Heap Scan` with many recheck | Low `work_mem`, bitmap overflow | Increase `work_mem` |

---

## 13. Joins

### 🌍 When You'll Use This in the Real World

- **Order detail pages**: `INNER JOIN` orders with users and products to display "Alice ordered Widget X on Jan 5th" — the bread and butter of any transactional app.
- **Customer churn analysis**: `LEFT JOIN` users with orders, then filter `WHERE orders.id IS NULL` to find users who registered but never purchased — your "at-risk" segment.
- **Org chart / manager hierarchy**: Self-join `employees` on `manager_id = id` to display reporting chains.
- **Data integrity audits**: Anti-join patterns (`NOT EXISTS`) to find orphaned records — orders referencing deleted users, invoices without line items, etc.

### Inner Join (Default)

```sql
SELECT * FROM orders INNER JOIN users ON orders.user_id = users.id;
SELECT * FROM orders JOIN users ON orders.user_id = users.id;  -- equivalent
```

### USING Clause

When both tables share the same column name, `USING` is cleaner:

```sql
SELECT * FROM orders JOIN users USING (user_id);
```

### NATURAL JOIN — Avoid This

```sql
-- Joins on ALL columns with matching names — fragile, breaks when schema changes
SELECT * FROM orders NATURAL JOIN users;  -- DON'T DO THIS
```

### Join Types

| Type | Returns |
|---|---|
| `INNER JOIN` | Only rows with matches in both tables |
| `LEFT JOIN` | All left rows + matched right rows (NULL if no match) |
| `RIGHT JOIN` | All right rows + matched left rows |
| `FULL OUTER JOIN` | All rows from both tables, NULLs where no match |
| `CROSS JOIN` | Cartesian product (every row × every row) |

### Self Join

```sql
-- Find employees and their managers
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

### Anti-Join Pattern (Find Rows Without Matches)

```sql
-- Method 1: LEFT JOIN + IS NULL (most readable)
SELECT u.* FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;

-- Method 2: NOT EXISTS (often fastest)
SELECT u.* FROM users u
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- Method 3: NOT IN (⚠️ avoid if subquery can return NULLs)
SELECT u.* FROM users u
WHERE u.id NOT IN (SELECT user_id FROM orders WHERE user_id IS NOT NULL);
```

### ROWS FROM

Merge results from multiple set-returning functions side by side:

```sql
SELECT *
FROM ROWS FROM (
  generate_series(1, 3),
  unnest(ARRAY['a', 'b', 'c'])
) AS t(num, letter);
```

---

## 14. Subqueries

### 🌍 When You'll Use This in the Real World

- **Price comparison**: "Show me products above the average price" — a scalar subquery in `WHERE` calculates the average once and filters against it.
- **Geo-targeted marketing**: `WHERE user_id IN (SELECT id FROM users WHERE country = 'UK')` — find all orders from UK customers without restructuring the query as a join.
- **Admin dashboards**: Scalar subqueries in `SELECT` to show per-row counts like "3 orders" next to each user — though for large datasets, rewriting as a `LEFT JOIN` with `GROUP BY` performs better.
- **Derived tables for aggregation**: Calculate department-level averages in a subquery, then filter departments above a threshold in the outer query.

### In WHERE Clause

```sql
-- Scalar subquery
SELECT * FROM products WHERE price > (SELECT AVG(price) FROM products);

-- IN subquery
SELECT * FROM orders WHERE user_id IN (SELECT id FROM users WHERE country = 'LK');

-- EXISTS subquery (correlated — generally preferred over IN for large sets)
SELECT * FROM users u
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.total > 1000);
```

### In FROM Clause (Derived Table)

```sql
SELECT dept, avg_salary
FROM (
  SELECT department AS dept, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department
) AS dept_stats
WHERE avg_salary > 50000;
```

### In SELECT Clause (Scalar Subquery)

```sql
SELECT
  u.name,
  (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u;
```

> ⚠️ Scalar subqueries in SELECT execute once per row — this can be slow for large tables. Prefer a `LEFT JOIN` with `GROUP BY` or a `LATERAL` join.

### Subquery Optimization

PostgreSQL can sometimes rewrite subqueries as joins internally. But writing explicit joins often helps the planner make better choices. As a rule: use subqueries for readability, but if performance is critical, rewrite correlated subqueries as joins.

---

## 15. Lateral Joins

### 🌍 When You'll Use This in the Real World

- **"Most recent" per entity**: Show each user's latest order, each product's most recent review, or each account's last login — `LATERAL` with `LIMIT 1` is the idiomatic PostgreSQL solution.
- **Top-N per group**: "Top 3 best-selling products per category" for a homepage — `LATERAL` with `ORDER BY sales DESC LIMIT 3` avoids the complexity of window functions with row filtering.
- **Per-row API-style lookups**: For each warehouse, find the nearest 5 customers — `LATERAL` lets you run a spatial query per warehouse row.
- **Unnesting with context**: Expand a JSONB array from each row while keeping the parent row's columns available.

A `LATERAL` join lets a subquery **reference columns from preceding tables** in the FROM clause — it executes once per row of the outer table.

### Basic Syntax

```sql
SELECT u.name, recent.order_total
FROM users u
CROSS JOIN LATERAL (
  SELECT total AS order_total
  FROM orders o
  WHERE o.user_id = u.id
  ORDER BY o.created_at DESC
  LIMIT 1
) AS recent;
```

> ⚠️ `CROSS JOIN LATERAL` excludes outer rows where the subquery returns nothing. Use `LEFT JOIN LATERAL ... ON TRUE` to include them with NULLs.

### Top-N Per Group

```sql
-- Top 3 most expensive orders per user
SELECT u.name, top_orders.*
FROM users u
LEFT JOIN LATERAL (
  SELECT total, created_at
  FROM orders
  WHERE user_id = u.id
  ORDER BY total DESC
  LIMIT 3
) AS top_orders ON TRUE;
```

### Comparison Table

| Feature | Normal JOIN | Subquery | LATERAL Join |
|---|---|---|---|
| **Purpose** | Combine full sets | Produce a scalar or independent set | Per-row dependent subquery |
| **Column Referencing** | Only joined tables | Cannot reference other FROM tables | ✅ Can reference preceding tables |
| **Execution** | Set-based | Once (or once per row if correlated) | Once per outer row |
| **Best For** | Standard data merging | Scalar values, independent aggregations | Top-N per group, per-row function calls, unnesting |

---

## 16. Window Functions

### 🌍 When You'll Use This in the Real World

- **Financial dashboards**: Running totals (`SUM() OVER`) to show cumulative revenue throughout the month — each row shows both the daily amount and the running total.
- **Leaderboards & rankings**: `RANK()` or `DENSE_RANK()` to rank salespeople by quarterly revenue, students by exam score, or products by review count.
- **Month-over-month growth**: `LAG(revenue, 1)` gives you last month's revenue on the same row, so you can compute `(current - previous) / previous * 100` as growth percentage.
- **Moving averages for analytics**: A 7-day moving average of daily active users smooths out weekend dips — use `AVG() OVER (ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`.
- **Deduplication**: `ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC)` assigns 1 to the most recent row per email — filter `WHERE rn = 1` to keep only the latest.

Window functions perform calculations **across a set of rows related to the current row** without collapsing rows like `GROUP BY`.

### Syntax

```sql
function_name() OVER (
  [PARTITION BY column_list]
  [ORDER BY column_list]
  [frame_clause]
)
```

### Common Window Functions

| Function | Description |
|---|---|
| `ROW_NUMBER()` | Unique sequential number per row |
| `RANK()` | Rank with gaps for ties |
| `DENSE_RANK()` | Rank without gaps |
| `NTILE(n)` | Distribute rows into n equal buckets |
| `LAG(col, n, default)` | Value from n rows before |
| `LEAD(col, n, default)` | Value from n rows ahead |
| `FIRST_VALUE(col)` | First value in the window frame |
| `LAST_VALUE(col)` | Last value in the frame |
| `NTH_VALUE(col, n)` | Nth value in the frame |
| `SUM() / AVG() / COUNT()` | Running aggregate over the window |
| `PERCENT_RANK()` | Relative rank (0 to 1) |
| `CUME_DIST()` | Cumulative distribution |

### Examples

```sql
-- Running total per user
SELECT user_id, order_date, amount,
  SUM(amount) OVER (PARTITION BY user_id ORDER BY order_date) AS running_total
FROM orders;

-- Rank products by price within each category
SELECT name, category, price,
  RANK() OVER (PARTITION BY category ORDER BY price DESC) AS price_rank
FROM products;

-- Difference from previous row
SELECT order_date, amount,
  amount - LAG(amount) OVER (ORDER BY order_date) AS daily_change
FROM daily_sales;

-- Moving average (last 7 days)
SELECT order_date, amount,
  AVG(amount) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7d
FROM daily_sales;

-- Percentile within group
SELECT name, salary,
  PERCENT_RANK() OVER (ORDER BY salary) AS percentile
FROM employees;
```

### Frame Clauses

The frame defines which rows are included in the window calculation:

```sql
-- Default frame (when ORDER BY is present):
RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW

-- Explicit frame options:
ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW    -- all rows from start to current
ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING             -- sliding window of 7 rows
ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING      -- current to end
ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING  -- entire partition
```

> ⚠️ `LAST_VALUE()` with the default frame often returns the current row — not the actual last row. Use `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to fix.

### Named Windows

```sql
SELECT
  user_id, amount,
  SUM(amount) OVER w AS running_total,
  ROW_NUMBER() OVER w AS row_num,
  LAG(amount) OVER w AS prev_amount
FROM orders
WINDOW w AS (PARTITION BY user_id ORDER BY created_at);
```

---

## 17. CTEs (Common Table Expressions)

### 🌍 When You'll Use This in the Real World

- **Complex reporting queries**: Break a 100-line query into named steps — `active_users`, `user_orders`, `revenue_by_tier` — so teammates can read and maintain it.
- **Org chart traversal**: Recursive CTEs walk tree structures — employee hierarchies, category trees, threaded comments, bill-of-materials explosions.
- **Data archival**: Writable CTEs let you `DELETE` old records and `INSERT` them into an archive table in a single atomic statement — no risk of deleting without archiving.
- **ETL pipelines**: Chain CTEs to extract, transform, and load data in one query: clean raw imports, deduplicate, compute derived fields, then insert into the final table.

A CTE is a **named temporary result set** defined with `WITH`, making complex queries more readable and maintainable.

```sql
WITH active_users AS (
  SELECT id, name FROM users WHERE active = TRUE
),
user_orders AS (
  SELECT user_id, COUNT(*) AS order_count
  FROM orders
  GROUP BY user_id
)
SELECT u.name, o.order_count
FROM active_users u
JOIN user_orders o ON u.id = o.user_id
ORDER BY o.order_count DESC;
```

### CTE Materialization (PostgreSQL 12+)

By default, CTEs in PostgreSQL 12+ can be inlined (optimized like subqueries). You can force materialization if needed:

```sql
-- Force materialization (useful as an optimization fence)
WITH user_stats AS MATERIALIZED (
  SELECT user_id, COUNT(*) AS cnt FROM orders GROUP BY user_id
)
SELECT * FROM user_stats WHERE cnt > 10;

-- Force inlining (default behavior, but explicit)
WITH user_stats AS NOT MATERIALIZED (
  SELECT user_id, COUNT(*) AS cnt FROM orders GROUP BY user_id
)
SELECT * FROM user_stats WHERE cnt > 10;
```

### Recursive CTE

```sql
-- Traverse an org chart hierarchy
WITH RECURSIVE org_tree AS (
  -- Base case: top-level managers
  SELECT id, name, manager_id, 0 AS depth, ARRAY[name] AS path
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursive step
  SELECT e.id, e.name, e.manager_id, t.depth + 1, t.path || e.name
  FROM employees e
  JOIN org_tree t ON e.manager_id = t.id
  WHERE t.depth < 10  -- safety limit to prevent infinite recursion
)
SELECT * FROM org_tree ORDER BY path;
```

### Writable CTEs

CTEs can contain `INSERT`, `UPDATE`, `DELETE` — useful for complex data manipulation:

```sql
-- Archive and delete in one statement
WITH archived AS (
  DELETE FROM orders
  WHERE status = 'cancelled' AND created_at < NOW() - INTERVAL '1 year'
  RETURNING *
)
INSERT INTO orders_archive SELECT * FROM archived;

-- Upsert with returning
WITH new_data AS (
  INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice')
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
  RETURNING id, email
)
SELECT * FROM new_data;
```

---

## 18. Transactions & Concurrency Control

### 🌍 When You'll Use This in the Real World

- **Money transfers**: Debit one account and credit another inside a single transaction — if either fails, both roll back. This is the textbook ACID example, and it matters every day in fintech.
- **Inventory management**: Use `SELECT ... FOR UPDATE` to lock a product row before decrementing stock — prevents two simultaneous purchases from overselling.
- **Job queues**: `FOR UPDATE SKIP LOCKED` turns a PostgreSQL table into a reliable work queue — workers grab the next unlocked task without blocking each other.
- **Idempotent API endpoints**: Wrap read-then-write operations in `REPEATABLE READ` to prevent race conditions where two concurrent requests both read "5 items in stock" and both try to sell the last one.
- **Cron job deduplication**: Advisory locks prevent two instances of the same cron job from running simultaneously across multiple app servers.

### Transaction Basics

```sql
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- Or roll back on error
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  -- Something goes wrong
ROLLBACK;
```

### Savepoints

Partial rollback within a transaction:

```sql
BEGIN;
  INSERT INTO orders (user_id, total) VALUES (1, 100);
  SAVEPOINT before_payment;
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    -- Payment processing fails
  ROLLBACK TO before_payment;
  -- Order insert is still intact
  UPDATE orders SET status = 'payment_failed' WHERE id = currval('orders_id_seq');
COMMIT;
```

### Isolation Levels

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly |
|---|---|---|---|---|
| `READ UNCOMMITTED` | Possible* | Possible | Possible | Possible |
| `READ COMMITTED` (default) | No | Possible | Possible | Possible |
| `REPEATABLE READ` | No | No | No** | Possible |
| `SERIALIZABLE` | No | No | No | No |

> *PostgreSQL treats `READ UNCOMMITTED` identically to `READ COMMITTED`.
> **PostgreSQL's REPEATABLE READ also prevents phantom reads (stronger than SQL standard).

```sql
-- Set isolation level for a transaction
BEGIN ISOLATION LEVEL SERIALIZABLE;
  SELECT * FROM accounts WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 1;
COMMIT;  -- may fail with serialization_failure — retry the transaction

-- Set default for the session
SET default_transaction_isolation = 'repeatable read';
```

### Advisory Locks

Application-level locks — PostgreSQL provides the infrastructure, you define the semantics:

```sql
-- Session-level advisory lock (held until session ends or explicitly released)
SELECT pg_advisory_lock(12345);       -- blocks until acquired
SELECT pg_advisory_unlock(12345);

-- Transaction-level advisory lock (auto-released at end of transaction)
SELECT pg_advisory_xact_lock(12345);

-- Try lock (non-blocking — returns TRUE/FALSE)
SELECT pg_try_advisory_lock(12345);
```

Use cases: rate limiting, preventing duplicate cron job execution, distributed locking.

### Row-Level Locking

```sql
-- SELECT ... FOR UPDATE — lock rows for modification
SELECT * FROM inventory WHERE product_id = 42 FOR UPDATE;

-- SKIP LOCKED — skip rows already locked (great for job queues)
SELECT * FROM tasks WHERE status = 'pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;

-- NOWAIT — fail immediately instead of waiting
SELECT * FROM inventory WHERE product_id = 42 FOR UPDATE NOWAIT;
```

### Deadlock Prevention

- Always lock rows in a **consistent order** (e.g., by primary key ascending).
- Keep transactions as short as possible.
- Use `NOWAIT` or `lock_timeout` to detect deadlocks early.
- PostgreSQL automatically detects and aborts one of the deadlocked transactions.

```sql
SET lock_timeout = '5s';  -- fail if lock not acquired within 5 seconds
```

---

## 19. Table Partitioning

### 🌍 When You'll Use This in the Real World

- **Event/log storage**: Your `events` table has 500 million rows and grows by 2 million daily. Range-partition by month — queries for "last 7 days" only scan the current partition, and dropping a 2-year-old partition is instant vs. a multi-hour `DELETE`.
- **Multi-region SaaS**: List-partition `orders` by region (`APAC`, `EMEA`, `Americas`) so region-specific reports only touch their partition.
- **Data retention policies**: Detach and drop partitions older than your retention window — no expensive `DELETE` statements, no bloat, no vacuum pressure.
- **Large-scale analytics**: Partitioning enables parallel query execution across partitions, dramatically speeding up aggregate queries on massive datasets.

Partitioning divides a large table into smaller physical pieces (partitions) while presenting a single logical table. Essential for tables with hundreds of millions of rows.

### Partition Strategies

| Strategy | Syntax | Best For |
|---|---|---|
| Range | `PARTITION BY RANGE (column)` | Time-series data, date ranges |
| List | `PARTITION BY LIST (column)` | Category, region, status |
| Hash | `PARTITION BY HASH (column)` | Even distribution when no natural range/list |

### Range Partitioning (Most Common)

```sql
-- Parent table (contains no data itself)
CREATE TABLE events (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  event_time TIMESTAMPTZ NOT NULL,
  payload JSONB,
  PRIMARY KEY (id, event_time)  -- partition key must be in PK
) PARTITION BY RANGE (event_time);

-- Create partitions
CREATE TABLE events_2025_q1 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE events_2025_q2 PARTITION OF events
  FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- Default partition (catches anything that doesn't match)
CREATE TABLE events_default PARTITION OF events DEFAULT;

-- Queries automatically target the correct partition (partition pruning)
SELECT * FROM events WHERE event_time >= '2025-02-01' AND event_time < '2025-03-01';
-- Only scans events_2025_q1
```

### List Partitioning

```sql
CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  region TEXT NOT NULL,
  total NUMERIC,
  PRIMARY KEY (id, region)
) PARTITION BY LIST (region);

CREATE TABLE orders_apac PARTITION OF orders FOR VALUES IN ('APAC', 'SEA', 'ANZ');
CREATE TABLE orders_emea PARTITION OF orders FOR VALUES IN ('EMEA', 'EU', 'UK');
CREATE TABLE orders_americas PARTITION OF orders FOR VALUES IN ('NA', 'LATAM');
```

### Partition Maintenance

```sql
-- Detach a partition (instant, no data movement)
ALTER TABLE events DETACH PARTITION events_2025_q1;

-- Attach an existing table as a partition
ALTER TABLE events ATTACH PARTITION events_2025_q3
  FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

-- Drop old data by dropping the partition (instant vs. DELETE which is slow)
DROP TABLE events_2024_q1;
```

### Partitioning Best Practices

- Partition key **must** be part of the primary key and any unique constraints.
- Always create a `DEFAULT` partition to avoid insert failures.
- Create future partitions ahead of time (automate with `pg_partman` extension or cron).
- Keep partition count manageable — hundreds are fine, thousands cause planning overhead.
- Ensure queries include the partition key in `WHERE` to enable partition pruning.

---

## 20. Views & Materialized Views

### 🌍 When You'll Use This in the Real World

- **Role-based data access**: Create views that filter sensitive columns — a `customer_view` hides internal pricing tiers and cost data from the support team's database access.
- **Simplifying complex joins**: Wrap a 6-table join into a `v_order_details` view so application developers write `SELECT * FROM v_order_details WHERE order_id = 42` instead of recreating the join.
- **Executive dashboards**: A materialized view pre-computes `monthly_revenue` by aggregating millions of order rows. The dashboard queries the materialized view in milliseconds; a cron job refreshes it every hour.
- **API response shaping**: Create views that match your API response schema exactly — the API layer does a simple `SELECT *` and serializes directly.

### Regular Views

A view is a **named query** — it does not store data, it re-executes the query each time:

```sql
CREATE VIEW active_user_orders AS
SELECT u.name, o.id AS order_id, o.total, o.created_at
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.active = TRUE;

-- Use it like a table
SELECT * FROM active_user_orders WHERE total > 100;

-- Updatable views (simple views on single tables)
CREATE VIEW pending_orders AS
SELECT * FROM orders WHERE status = 'pending';

-- Insert through the view
INSERT INTO pending_orders (user_id, total, status) VALUES (1, 50, 'pending');
```

### Materialized Views

A materialized view **stores the result set physically** — queries read the stored data instead of re-executing the query. Trade freshness for speed.

```sql
CREATE MATERIALIZED VIEW monthly_revenue AS
SELECT
  date_trunc('month', created_at) AS month,
  SUM(total) AS revenue,
  COUNT(*) AS order_count
FROM orders
GROUP BY 1
ORDER BY 1;

-- Create an index on the materialized view
CREATE UNIQUE INDEX idx_monthly_revenue_month ON monthly_revenue(month);

-- Refresh the data (blocks reads during refresh)
REFRESH MATERIALIZED VIEW monthly_revenue;

-- Refresh without blocking reads (requires a UNIQUE index)
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue;
```

### When to Use Materialized Views

- Dashboard queries that aggregate millions of rows but don't need real-time freshness.
- Complex joins that rarely change (e.g., denormalized reporting tables).
- Full-text search vectors on computed fields.

> ⚠️ Materialized views don't auto-refresh. Set up a cron job, `pg_cron`, or application-level trigger to refresh them on a schedule.

---

## 21. Stored Procedures & Functions

### 🌍 When You'll Use This in the Real World

- **Fund transfers in banking apps**: A `transfer_funds()` function wraps balance checks, debits, credits, and audit logging into a single atomic call — no risk of partial execution from application-level bugs.
- **Batch processing**: A `batch_process_orders()` procedure commits in chunks of 1,000, so a 2-million-row update doesn't hold a single enormous transaction and block autovacuum.
- **Computed columns in queries**: A `STABLE` function like `get_user_tier(user_id)` can be used in `SELECT` lists and `WHERE` clauses, encapsulating complex business logic the planner can optimize.
- **Data validation beyond CHECK constraints**: Functions that cross-reference multiple tables (e.g., "this discount code is valid for this product category") before allowing an insert.

### Functions (Return a Value)

```sql
CREATE OR REPLACE FUNCTION get_user_order_total(p_user_id BIGINT)
RETURNS NUMERIC
LANGUAGE SQL
STABLE  -- tells planner the function doesn't modify data
AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM orders
  WHERE user_id = p_user_id;
$$;

-- Usage
SELECT get_user_order_total(42);
```

### PL/pgSQL Functions (Procedural Logic)

```sql
CREATE OR REPLACE FUNCTION transfer_funds(
  p_from_account BIGINT,
  p_to_account BIGINT,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  -- Check balance
  SELECT balance INTO v_balance FROM accounts WHERE id = p_from_account FOR UPDATE;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds: balance=%, amount=%', v_balance, p_amount;
  END IF;

  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from_account;
  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to_account;
END;
$$;
```

### Procedures (PostgreSQL 11+) — Support Transaction Control

```sql
CREATE OR REPLACE PROCEDURE batch_process_orders(p_batch_size INT DEFAULT 1000)
LANGUAGE plpgsql
AS $$
DECLARE
  v_processed INT := 0;
BEGIN
  LOOP
    UPDATE orders SET status = 'processed'
    WHERE id IN (
      SELECT id FROM orders WHERE status = 'pending' ORDER BY created_at LIMIT p_batch_size
    );

    GET DIAGNOSTICS v_processed = ROW_COUNT;
    EXIT WHEN v_processed = 0;

    COMMIT;  -- procedures can commit mid-execution (functions cannot)
    RAISE NOTICE 'Processed % orders', v_processed;
  END LOOP;
END;
$$;

-- Execute
CALL batch_process_orders(5000);
```

### Function Volatility Categories

| Category | Meaning | Optimizer Behavior |
|---|---|---|
| `IMMUTABLE` | Always returns the same result for same inputs | Can be pre-evaluated at plan time |
| `STABLE` | Returns the same result within a single query | Safe to call multiple times per query |
| `VOLATILE` (default) | Result can change between calls | Called every time |

> ⚠️ Marking a function `IMMUTABLE` when it's not (e.g., it reads tables) can produce wrong results. Be honest with volatility.

---

## 22. Triggers & Event-Driven Logic

### 🌍 When You'll Use This in the Real World

- **Audit trails (compliance / SOC 2)**: An `AFTER INSERT OR UPDATE OR DELETE` trigger on sensitive tables automatically logs who changed what and when — required for financial services, healthcare (HIPAA), and enterprise SaaS.
- **Automatic `updated_at` timestamps**: A `BEFORE UPDATE` trigger sets `updated_at = NOW()` on every row change — no reliance on application code remembering to set it.
- **Denormalized counters**: A trigger on `comments` that increments `posts.comment_count` — faster than `COUNT(*)` on read-heavy pages, though you trade write complexity.
- **Schema change tracking**: Event triggers log all DDL changes (`CREATE TABLE`, `ALTER COLUMN`) — useful for auditing who changed the schema in shared development environments.

### When to Use Triggers (and When Not To)

**Use triggers for:**
- Audit logging (who changed what, when)
- Maintaining derived/denormalized data
- Enforcing complex cross-table constraints that can't be expressed as CHECK constraints

**Avoid triggers for:**
- Business logic (belongs in the application)
- Anything that can be a CHECK constraint or FK constraint
- Complex cascading operations (hard to debug, creates hidden behavior)

### Row-Level Trigger

```sql
-- Audit table
CREATE TABLE audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by TEXT DEFAULT current_user
);

-- Trigger function
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to table
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
```

### Updated_at Trigger

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### Event Triggers (DDL-Level)

```sql
-- Log all DDL changes
CREATE OR REPLACE FUNCTION log_ddl_event()
RETURNS event_trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE NOTICE 'DDL event: %, command: %', TG_EVENT, TG_TAG;
END;
$$;

CREATE EVENT TRIGGER ddl_logger ON ddl_command_end EXECUTE FUNCTION log_ddl_event();
```

---

## 23. Roles, Privileges & Row-Level Security

### 🌍 When You'll Use This in the Real World

- **Multi-tenant SaaS (Supabase model)**: RLS policies ensure tenant A can never see tenant B's data, even if the application has a bug — the database itself enforces isolation.
- **Principle of least privilege**: Your web app connects as `app_writer` (INSERT/UPDATE/DELETE) while your analytics pipeline connects as `app_reader` (SELECT only) — a compromised analytics credential can't modify data.
- **Schema-based isolation**: Enterprise customers each get their own schema (`tenant_acme`, `tenant_globex`) with separate permissions — stronger isolation than shared tables with RLS.
- **Microservice database access**: Each microservice gets its own role with access only to the tables it needs — the billing service can't accidentally query the user profiles table.

### Role Management

```sql
-- Create a role (login user)
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';

-- Create a group role
CREATE ROLE app_readers;
GRANT app_readers TO app_user;  -- app_user inherits app_readers' privileges

-- Grant privileges
GRANT CONNECT ON DATABASE mydb TO app_readers;
GRANT USAGE ON SCHEMA public TO app_readers;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readers;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_readers;

-- Application role with limited writes
CREATE ROLE app_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_writer;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_writer;
```

### Schema-Based Multi-Tenancy

```sql
CREATE SCHEMA tenant_acme;
CREATE SCHEMA tenant_globex;

-- Each tenant's tables live in their schema
SET search_path = tenant_acme;
CREATE TABLE users (...);

-- Grant access per-tenant
GRANT USAGE ON SCHEMA tenant_acme TO acme_user;
GRANT ALL ON ALL TABLES IN SCHEMA tenant_acme TO acme_user;
```

### Row-Level Security (RLS)

RLS enforces per-row access control — essential for multi-tenant applications sharing a single table:

```sql
-- Enable RLS on the table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own orders
CREATE POLICY user_orders_policy ON orders
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::BIGINT)
  WITH CHECK (user_id = current_setting('app.current_user_id')::BIGINT);

-- Set the user context per request (from the application)
SET app.current_user_id = '42';
SELECT * FROM orders;  -- only sees user 42's orders

-- Force RLS for table owners too (by default, owners bypass RLS)
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
```

> ⚠️ **RLS adds overhead to every query.** Test performance with realistic data volumes. Ensure indexes cover the columns used in policies.

---

## 24. Performance Tuning & Configuration

### 🌍 When You'll Use This in the Real World

- **First deployment on a new server**: The PostgreSQL defaults assume a tiny machine. Setting `shared_buffers` to 25% of RAM and `effective_cache_size` to 75% can immediately double query throughput.
- **SSD migration**: Changing `random_page_cost` from 4.0 to 1.1 tells the planner that random reads are cheap — it'll prefer index scans over sequential scans more aggressively.
- **Connection exhaustion in production**: Your app has 50 servers each opening 20 connections = 1,000 connections. PostgreSQL struggles above 300. Add PgBouncer in transaction mode and set `max_connections = 200`.
- **Identifying slow queries**: Enable `pg_stat_statements` on day one. When a customer reports "the app is slow," you can immediately find the top 10 most expensive queries by total execution time.

### Critical postgresql.conf Settings

| Parameter | Default | Recommended | Description |
|---|---|---|---|
| `shared_buffers` | 128MB | 25% of RAM | PostgreSQL's shared memory cache |
| `effective_cache_size` | 4GB | 50-75% of RAM | Planner's estimate of OS cache |
| `work_mem` | 4MB | 32-256MB* | Per-operation memory for sorts/hashes |
| `maintenance_work_mem` | 64MB | 512MB-2GB | Memory for VACUUM, CREATE INDEX |
| `wal_buffers` | -1 (auto) | 64MB | WAL write buffer |
| `random_page_cost` | 4.0 | 1.1 (SSD), 4.0 (HDD) | Cost estimate for random I/O |
| `effective_io_concurrency` | 1 | 200 (SSD) | Concurrent I/O operations |
| `max_connections` | 100 | 100-300† | Max concurrent connections |
| `max_parallel_workers_per_gather` | 2 | 2-4 | Parallel query workers |

> *`work_mem` is per-operation, not per-connection. A complex query with 10 sorts can use 10× work_mem. Start conservative.
> †Use a connection pooler (PgBouncer, pgcat) instead of increasing max_connections.

### Connection Pooling

Direct PostgreSQL connections are expensive (~10MB per connection). For web applications:

- **PgBouncer** (most common) — lightweight connection pooler, supports transaction and session pooling.
- **pgcat** — newer Rust-based pooler with sharding support.
- **Built-in application pooling** (e.g., HikariCP for Java, SQLAlchemy pool for Python).

### Query Performance Checklist

1. **Run `EXPLAIN (ANALYZE, BUFFERS)`** on slow queries.
2. **Check for sequential scans** on large tables — add indexes.
3. **Check for estimated vs. actual row mismatches** — run `ANALYZE`.
4. **Ensure `work_mem` is adequate** — look for `Sort Method: external merge Disk`.
5. **Check index usage** — `pg_stat_user_indexes` shows how often each index is scanned.
6. **Monitor slow queries** — set `log_min_duration_statement = 1000` (ms).
7. **Use `pg_stat_statements`** extension to find the most expensive queries by total time.

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 queries by total execution time
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

---

## 25. Vacuum, Autovacuum & Bloat Management

### 🌍 When You'll Use This in the Real World

- **High-write tables (sessions, events, queues)**: Tables with millions of UPDATEs/DELETEs per day accumulate dead rows fast. Tune autovacuum to run more aggressively (`scale_factor = 0.05` instead of the default 0.2) to prevent bloat.
- **Post-bulk-import maintenance**: After loading 10 million rows via `COPY`, run `ANALYZE` immediately — otherwise the query planner has stale statistics and will choose bad execution plans.
- **Mysterious disk growth**: Your 5GB table is now 20GB despite having the same row count. Dead rows from updates are bloating it. Regular `VACUUM` reclaims space for reuse; `pg_repack` reclaims it to the OS without locking.
- **Preventing the "wraparound shutdown"**: If long-running transactions block autovacuum for too long, PostgreSQL will eventually refuse all writes and force a shutdown to prevent transaction ID wraparound. Monitor `age(datfrozenxid)` in production alerts.

### Why VACUUM Exists

PostgreSQL uses **MVCC** (Multi-Version Concurrency Control): `UPDATE` and `DELETE` don't remove old row versions immediately — they mark them as "dead." VACUUM reclaims this space.

### How It Works

| Operation | What It Does |
|---|---|
| `VACUUM` | Reclaims dead rows, updates visibility map — space reusable by the same table |
| `VACUUM FULL` | Rewrites the entire table to reclaim space to OS — **locks the table** |
| `VACUUM ANALYZE` | Vacuum + update planner statistics |
| `ANALYZE` | Update statistics only (no space reclaim) |

```sql
-- Manual vacuum (rarely needed — autovacuum handles this)
VACUUM VERBOSE orders;

-- Vacuum + analyze
VACUUM ANALYZE orders;

-- Nuclear option (locks table, rewrites it — use only for severe bloat)
VACUUM FULL orders;
```

### Autovacuum Tuning

Autovacuum runs automatically but may need tuning for high-write tables:

```sql
-- Per-table autovacuum settings
ALTER TABLE high_write_table SET (
  autovacuum_vacuum_threshold = 100,          -- min dead rows before vacuum
  autovacuum_vacuum_scale_factor = 0.05,      -- fraction of table (default 0.2)
  autovacuum_analyze_threshold = 50,
  autovacuum_analyze_scale_factor = 0.02
);
```

### Monitoring Bloat

```sql
-- Check dead tuple count
SELECT relname, n_live_tup, n_dead_tup,
  ROUND(n_dead_tup::NUMERIC / GREATEST(n_live_tup, 1) * 100, 2) AS dead_pct,
  last_vacuum, last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

> 💡 If autovacuum can't keep up, check: (1) Is `autovacuum_max_workers` sufficient? (2) Is `maintenance_work_mem` large enough? (3) Are long-running transactions holding back the vacuum horizon?

### Transaction ID Wraparound — The Silent Killer

PostgreSQL uses 32-bit transaction IDs. After ~2 billion transactions, IDs wrap around and old data "disappears." Autovacuum's `anti-wraparound` mode prevents this, but if it's blocked (e.g., by long-running transactions), you'll see warnings:

```
WARNING: database "mydb" must be vacuumed within X transactions
```

This is a **critical alert**. The database will shut down to prevent data loss if it gets too close. Monitor `age(datfrozenxid)` and ensure autovacuum runs regularly.

---

## 26. Backup, Recovery & Replication

### 🌍 When You'll Use This in the Real World

- **Disaster recovery**: `pg_basebackup` + continuous WAL archiving gives you point-in-time recovery — restore to "5 minutes before the accidental DELETE" instead of losing a full day's data.
- **Read replicas for scaling**: Streaming replication creates read replicas that handle analytics queries and reporting, keeping the primary free for writes.
- **Zero-downtime major version upgrades**: Logical replication lets you set up a new PostgreSQL 17 instance subscribing to your PostgreSQL 15 primary, then switch over with minimal downtime.
- **Nightly backups for compliance**: `pg_dump -Fc` with parallel jobs creates compressed backups that satisfy SOC 2 and GDPR data retention requirements. But always test restores — an untested backup is not a backup.

### Backup Strategies

| Method | Type | Point-in-Time? | Speed | Use Case |
|---|---|---|---|---|
| `pg_dump` | Logical | No | Medium | Single database backup, schema migration |
| `pg_dumpall` | Logical | No | Slow | All databases + globals (roles, etc.) |
| `pg_basebackup` | Physical | Yes (with WAL) | Fast | Full cluster backup, replica setup |
| Continuous Archiving | Physical (WAL) | Yes | Continuous | Production PITR, disaster recovery |

```bash
# Logical backup (single database, custom format — supports parallel restore)
pg_dump -Fc -j4 mydb > mydb.dump

# Restore
pg_restore -d mydb -j4 mydb.dump

# Logical backup (all databases)
pg_dumpall > all_databases.sql

# Physical backup (base + WAL for PITR)
pg_basebackup -D /backups/base -Ft -z -P
```

### Streaming Replication

```sql
-- On primary: configure pg_hba.conf for replication connections
-- On replica:
-- 1. pg_basebackup from primary
-- 2. Create standby.signal file
-- 3. Configure primary_conninfo in postgresql.conf
ALTER SYSTEM SET primary_conninfo = 'host=primary_host port=5432 user=replicator password=secret';
```

### Logical Replication (PostgreSQL 10+)

Replicates individual tables (not the whole cluster) — useful for zero-downtime migrations, cross-version upgrades, and selective data sharing:

```sql
-- On publisher
CREATE PUBLICATION my_pub FOR TABLE users, orders;

-- On subscriber
CREATE SUBSCRIPTION my_sub
  CONNECTION 'host=publisher_host dbname=mydb user=replicator'
  PUBLICATION my_pub;
```

---

## 27. Extensions

### 🌍 When You'll Use This in the Real World

- **Performance monitoring (every production database)**: `pg_stat_statements` is non-negotiable — it tracks the most expensive queries so you know exactly where to optimize.
- **Location-based features**: `PostGIS` powers "find restaurants within 5km" queries for delivery apps, real estate searches, and fleet management.
- **Automated partition management**: `pg_partman` creates future partitions on a schedule and drops expired ones — essential for time-series data that would otherwise require manual DDL scripts.
- **In-database scheduling**: `pg_cron` runs `REFRESH MATERIALIZED VIEW` every hour, purges old sessions nightly, and sends aggregated metrics — all without external cron infrastructure.
- **Password hashing**: `pgcrypto`'s `crypt()` and `gen_salt()` let you hash passwords directly in PostgreSQL — useful for legacy systems or when you want database-level authentication.

PostgreSQL's extension system is one of its greatest strengths. Key extensions every architect should know:

| Extension | Purpose |
|---|---|
| `pg_stat_statements` | Track query performance (essential) |
| `pgcrypto` | Cryptographic functions (hashing, encryption) |
| `pg_trgm` | Trigram similarity and fuzzy text search |
| `uuid-ossp` | UUID generation (for PG < 13) |
| `hstore` | Key-value pairs (lightweight alternative to JSONB) |
| `PostGIS` | Geographic/spatial data and queries |
| `pg_partman` | Automated partition management |
| `pg_cron` | In-database job scheduler |
| `citext` | Case-insensitive text type |
| `btree_gist` | GiST support for B-tree types (needed for EXCLUDE) |
| `tablefunc` | Crosstab / pivot table queries |
| `pg_repack` | Online table/index reorganization (no locks) |
| `timescaledb` | Time-series data optimization |

```sql
-- List installed extensions
SELECT * FROM pg_extension;

-- Install an extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## 28. Utility Patterns & Recipes

### 🌍 When You'll Use This in the Real World

- **Idempotent API writes**: `UPSERT` (INSERT ... ON CONFLICT) lets you safely retry failed API calls — if the row already exists, update it instead of throwing a duplicate key error. Essential for webhook handlers and payment processors.
- **Data deduplication after imports**: After merging customer lists from two CRMs, use `ROW_NUMBER() OVER (PARTITION BY email)` to identify and remove duplicate entries, keeping the most recent record.
- **Efficient API pagination**: Use keyset pagination (`WHERE id > last_seen_id ORDER BY id LIMIT 20`) instead of `OFFSET` — your page 500 loads as fast as page 1, critical for mobile apps scrolling through large feeds.
- **Bulk data loading**: Use `COPY` instead of individual `INSERT` statements when importing CSV files — it's 10-100x faster. For very large loads, drop indexes first, `COPY`, then recreate indexes.
- **Production monitoring**: Query `pg_stat_activity` to find long-running queries, kill runaway processes, and diagnose connection pool exhaustion during incidents.

### UPSERT (Insert or Update)

```sql
INSERT INTO users (email, name)
VALUES ('alice@example.com', 'Alice')
ON CONFLICT (email)
DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

-- Upsert with conditional update (only update if data actually changed)
INSERT INTO products (sku, name, price)
VALUES ('ABC123', 'Widget', 9.99)
ON CONFLICT (sku)
DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price
WHERE products.name IS DISTINCT FROM EXCLUDED.name
   OR products.price IS DISTINCT FROM EXCLUDED.price;

-- Insert-or-ignore
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice')
ON CONFLICT (email) DO NOTHING;
```

### Remove Duplicate Rows

```sql
-- Method 1: Keep one row per duplicate group
DELETE FROM users
WHERE id NOT IN (
  SELECT MIN(id) FROM users GROUP BY email
);

-- Method 2: CTE + ROW_NUMBER (more flexible — lets you choose which to keep)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) AS rn
  FROM users
)
DELETE FROM users WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

### Find Gaps in Sequences

```sql
SELECT s.id AS missing_id
FROM generate_series(1, (SELECT MAX(id) FROM orders)) AS s(id)
LEFT JOIN orders o ON o.id = s.id
WHERE o.id IS NULL;
```

### Bulk Insert with COPY (Fastest Method)

```sql
-- From a file (server-side)
COPY users (email, name) FROM '/tmp/users.csv' WITH (FORMAT csv, HEADER true);

-- From stdin (client-side, used by psql \copy)
\copy users (email, name) FROM 'users.csv' WITH (FORMAT csv, HEADER true);
```

> 💡 `COPY` is orders of magnitude faster than individual `INSERT` statements for bulk loading. For very large loads, drop indexes first, `COPY`, then recreate indexes.

### Pivot / Crosstab

```sql
CREATE EXTENSION IF NOT EXISTS tablefunc;

SELECT *
FROM crosstab(
  'SELECT department, quarter, revenue FROM sales ORDER BY 1, 2',
  'SELECT DISTINCT quarter FROM sales ORDER BY 1'
) AS ct(department TEXT, q1 NUMERIC, q2 NUMERIC, q3 NUMERIC, q4 NUMERIC);
```

### Generate Test Data

```sql
INSERT INTO users (name, email, created_at)
SELECT
  'User ' || i,
  'user' || i || '@example.com',
  NOW() - (random() * INTERVAL '365 days')
FROM generate_series(1, 100000) AS i;
```

### Paginating Results Efficiently

```sql
-- OFFSET-based (simple but slow for deep pages)
SELECT * FROM products ORDER BY id LIMIT 20 OFFSET 100;

-- Keyset pagination (fast and consistent — preferred for APIs)
SELECT * FROM products
WHERE id > 120  -- last seen ID from previous page
ORDER BY id
LIMIT 20;
```

### Monitoring Active Queries

```sql
-- See currently running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- Kill a long-running query
SELECT pg_cancel_backend(pid);   -- graceful (sends cancel signal)
SELECT pg_terminate_backend(pid); -- forceful (kills the connection)
```

### Table & Database Size

```sql
-- Table size (including indexes and TOAST)
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS data_size,
  pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Database size
SELECT pg_size_pretty(pg_database_size('mydb'));
```

---

## 29. Quick Reference Cheatsheet

### Data Type Decisions

| Situation | Recommended Type |
|---|---|
| Auto-increment primary key | `BIGINT GENERATED ALWAYS AS IDENTITY` |
| Distributed / public-facing ID | `UUID` (via `gen_random_uuid()`) |
| Timestamps | `TIMESTAMPTZ` (always UTC) |
| Duration / time arithmetic | `INTERVAL` |
| Date ranges, bookings | `TSTZRANGE` / `DATERANGE` |
| Strings | `TEXT` (not `VARCHAR`) |
| Money / exact decimals | `NUMERIC(p,s)` (never `FLOAT`) |
| JSON data | `JSONB` (not `JSON`) |
| Tags / multi-values | `TEXT[]` (array) |
| True/false | `BOOLEAN` (not `INT`) |
| Computed column | `GENERATED ALWAYS AS ... STORED` |
| Fixed set of values | `ENUM` or lookup table with FK |

### Index Decision Guide

| Access Pattern | Index Type |
|---|---|
| Equality + range queries | B-tree (default) |
| Equality only | Hash |
| JSONB containment / arrays / FTS | GIN |
| Range overlap / spatial / exclusion | GiST |
| Large append-only time-series | BRIN |
| Partial data (low-cardinality filter) | Partial Index |
| Avoid heap access for hot queries | Covering Index (`INCLUDE`) |
| Expression / function in WHERE | Functional Index |
| Fuzzy / typo-tolerant text | GIN with `pg_trgm` |

### Join Decision Guide

| Need | Use |
|---|---|
| Combine tables on shared key | `JOIN` |
| Single value or independent result set | Subquery |
| Per-row subquery with outer column reference | `LATERAL JOIN` |
| Find top-N per group | `LATERAL JOIN` with `LIMIT` |
| Rows without matches | `LEFT JOIN ... WHERE IS NULL` or `NOT EXISTS` |

### Transaction Decision Guide

| Scenario | Isolation Level |
|---|---|
| Most OLTP applications | `READ COMMITTED` (default) |
| Financial/inventory with read-then-write | `REPEATABLE READ` |
| Strict serializability requirements | `SERIALIZABLE` (with retry logic) |

---

## 30. Anti-Patterns to Avoid

### 🌍 When You'll Encounter These in the Real World

- **During code reviews**: A junior developer uses `FLOAT` for a `price` column or writes `SELECT *` in a production query — these anti-patterns are the most common source of subtle production bugs.
- **Post-incident analysis**: The database ran out of connections because no one configured a connection pooler. Or autovacuum was silently failing because a long-running analytics query held a transaction open for 6 hours.
- **Legacy system migrations**: You inherit a database with `SERIAL` IDs approaching the 2.1B limit, `VARCHAR(255)` everywhere, comma-separated values in text columns, and zero named constraints. Knowing these anti-patterns helps you prioritize what to fix first.
- **Performance fire drills**: The app is slow, and you discover `NOT IN` with a nullable column returning zero rows, or `WHERE UPPER(email) = ...` bypassing the B-tree index. These are the patterns that `EXPLAIN ANALYZE` will expose.

### Schema Design

- **Using `SERIAL` instead of `BIGINT GENERATED ALWAYS AS IDENTITY`** — SERIAL is legacy, IDENTITY is SQL-standard.
- **Storing monetary values as `FLOAT`** — use `NUMERIC` to avoid rounding errors.
- **Using `VARCHAR(255)` "just in case"** — use `TEXT`; there's no performance difference in PostgreSQL.
- **Putting business logic in triggers** — triggers create hidden side-effects; keep logic in the application.
- **Not naming constraints** — auto-generated names are unreadable in error messages and migration scripts.
- **Using `NATURAL JOIN`** — breaks when columns are added; always be explicit.
- **Storing comma-separated values in a TEXT column** — use arrays or a junction table.

### Queries

- **Using `SELECT *` in production code** — always list columns explicitly.
- **Using `NOT IN` with nullable columns** — if the subquery returns a NULL, the entire NOT IN evaluates to NULL (returns no rows). Use `NOT EXISTS` instead.
- **Overusing `DISTINCT` to hide join problems** — fix the joins instead.
- **Using `OFFSET` for deep pagination** — keyset/cursor pagination scales much better.
- **Wrapping indexed columns in functions** — `WHERE UPPER(email) = '...'` won't use a B-tree on `email`. Create a functional index instead.

### Performance

- **Missing indexes on foreign key columns** — PostgreSQL does NOT auto-create FK indexes. Missing them makes `DELETE` on the parent table do a sequential scan of the child.
- **Too many indexes** — each index slows writes. Monitor `pg_stat_user_indexes` and remove unused ones.
- **Not running `ANALYZE` after bulk loads** — the planner will make bad decisions with stale statistics.
- **Long-running transactions** — they block autovacuum and cause table bloat.
- **Not using connection pooling** — each PostgreSQL connection costs ~10MB of memory.
- **Ignoring `EXPLAIN ANALYZE`** — measure, don't guess.

### Operations

- **Not testing backups** — an untested backup is not a backup. Regularly restore to a test environment.
- **Running `VACUUM FULL` routinely** — it locks the entire table. Use `pg_repack` for online reorganization.
- **Not monitoring transaction ID wraparound** — can cause a forced database shutdown.
- **Not setting `statement_timeout` for application users** — one runaway query can take down the database.

```sql
-- Set a safety net
ALTER ROLE app_user SET statement_timeout = '30s';
ALTER ROLE app_user SET lock_timeout = '10s';
```

---

*Comprehensive PostgreSQL reference — from study notes to architect-level guide. Updated for PostgreSQL 15+.*

---

> This guide was created based on the source **Mastering Postgres** (by Aaron Francis), widely regarded as one of the best PostgreSQL courses.