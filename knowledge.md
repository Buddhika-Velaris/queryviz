# 🐘 PostgreSQL — The Definitive Learning Guide

> A comprehensive, architect-level reference for mastering PostgreSQL — from foundational data types and constraints through advanced query patterns, performance tuning, security, partitioning, concurrency, and production operations.

This guide was created based on the source **Mastering Postgres** (by Aaron Francis), widely regarded as one of the best PostgreSQL courses.

---

## Table of Contents

1. [Introduction to PostgreSQL](#1-introduction-to-postgresql)
2. [Schemas & Database Organization](#2-schemas-database-organization)
3. [Data Integrity & Constraints](#3-data-integrity-constraints)
4. [Domain Types](#4-domain-types)
5. [NULL Handling & COALESCE Patterns](#5-null-handling-coalesce-patterns)
6. [Time & Date Types](#6-time-date-types)
7. [Numeric & ID Types](#7-numeric-id-types)
8. [Sequences & Identity Columns](#8-sequences-identity-columns)
9. [String & Text Types](#9-string-text-types)
10. [Character Sets, Collations & Encoding](#10-character-sets-collations-encoding)
11. [Casting & Type Conversion](#11-casting-type-conversion)
12. [Binary Data & Bit Strings](#12-binary-data-bit-strings)
13. [Network & MAC Address Types](#13-network-mac-address-types)
14. [JSON Types](#14-json-types)
15. [Arrays](#15-arrays)
16. [Range Types](#16-range-types)
17. [Generated Columns](#17-generated-columns)
18. [Composite & Enum Types](#18-composite-enum-types)
19. [Full-Text Search](#19-full-text-search)
20. [Indexes — Theory & Practice](#20-indexes-theory-practice)
21. [EXPLAIN & Query Analysis](#21-explain-query-analysis)
22. [Joins](#22-joins)
23. [Subqueries](#23-subqueries)
24. [Lateral Joins](#24-lateral-joins)
25. [SET Operations & Combining Queries](#25-set-operations-combining-queries)
26. [Window Functions](#26-window-functions)
27. [Grouping Sets, ROLLUP & CUBE](#27-grouping-sets-rollup-cube)
28. [CTEs (Common Table Expressions)](#28-ctes-common-table-expressions)
29. [Transactions & Concurrency Control](#29-transactions-concurrency-control)
30. [Table Partitioning](#30-table-partitioning)
31. [Views & Materialized Views](#31-views-materialized-views)
32. [Stored Procedures & Functions](#32-stored-procedures-functions)
33. [Triggers & Event-Driven Logic](#33-triggers-event-driven-logic)
34. [Roles, Privileges & Row-Level Security](#34-roles-privileges-row-level-security)
35. [Performance Tuning & Configuration](#35-performance-tuning-configuration)
36. [Vacuum, Autovacuum & Bloat Management](#36-vacuum-autovacuum-bloat-management)
37. [Backup, Recovery & Replication](#37-backup-recovery-replication)
38. [Extensions](#38-extensions)
39. [pgvector & Semantic Search](#39-pgvector-semantic-search)
40. [Utility Patterns & Recipes](#40-utility-patterns-recipes)
41. [Quick Reference Cheatsheet](#41-quick-reference-cheatsheet)
42. [Anti-Patterns to Avoid](#42-anti-patterns-to-avoid)

---

## 1. Introduction to PostgreSQL

PostgreSQL (often called Postgres) is a powerful, open-source object-relational database management system with over 35 years of active development. It is known for its standards compliance, reliability, feature robustness, and extensibility.

### 🌍 When You'll Use This in the Real World

- **Any production application**: Postgres is the go-to choice for startups and enterprises alike — from small SaaS products to systems handling billions of rows.
- **Analytics workloads**: Postgres supports complex analytical queries, window functions, and CTEs that rival dedicated analytical databases.
- **Geospatial applications**: With the PostGIS extension, Postgres becomes one of the most capable spatial databases available.
- **Full-text search**: Built-in FTS eliminates the need for a separate search service in many applications.

### Architecture Overview

```
Client App
    │
    ▼
┌─────────────────────────────────────────┐
│              PostgreSQL Server          │
│                                         │
│  Postmaster ──► Connection Pool         │
│                      │                  │
│              ┌───────▼────────┐         │
│              │  Query Engine  │         │
│              │  Parser        │         │
│              │  Planner       │         │
│              │  Executor      │         │
│              └───────┬────────┘         │
│                      │                  │
│         ┌────────────▼──────────────┐   │
│         │    Storage Engine         │   │
│         │  Shared Buffer Cache      │   │
│         │  WAL (Write-Ahead Log)    │   │
│         │  Heap Files / TOAST       │   │
│         └───────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Key Concepts

| Concept | Description |
|---|---|
| **MVCC** | Multi-Version Concurrency Control — readers never block writers |
| **WAL** | Write-Ahead Logging — guarantees durability and enables replication |
| **TOAST** | The Oversized-Attribute Storage Technique — handles large values transparently |
| **Shared Buffers** | In-memory page cache — tune to ~25% of RAM |
| **Autovacuum** | Background process that reclaims dead tuple space and updates statistics |
| **Extensions** | First-class plugin system: PostGIS, pgvector, pg_stat_statements, etc. |

### Data Flow: From Query to Result

1. Client sends SQL over a TCP connection (or Unix socket)
2. **Parser** converts SQL text into a parse tree
3. **Analyzer** validates names, types, and permissions
4. **Rewriter** applies view and rule rewrites
5. **Planner/Optimizer** generates the lowest-cost execution plan
6. **Executor** runs the plan, reading from shared buffers or disk
7. Result rows are streamed back to the client

### Version Landscape

- **PostgreSQL 14+**: Pipeline mode, improved partitioning, logical replication improvements
- **PostgreSQL 15+**: `MERGE` statement, row filtering for publications
- **PostgreSQL 16+**: Logical replication from standbys, parallel queries improvements
- **PostgreSQL 17+**: Incremental backup, vectorized I/O, JSON improvements

Always use the latest stable release for new projects.

### Installation Quick Reference

```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt install postgresql-16

# Docker
docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres:16

# Connect
psql -U postgres -h localhost
```

### Essential psql Commands

```sql
\l          -- list databases
\c dbname   -- connect to database
\dt         -- list tables
\d table    -- describe table
\di         -- list indexes
\dn         -- list schemas
\du         -- list roles
\x          -- toggle expanded output
\timing     -- show query execution time
\e          -- open editor
\q          -- quit
```

---

## 2. Schemas & Database Organization

A **schema** in PostgreSQL is a named namespace within a database. It acts like a folder that groups tables, views, functions, sequences, and other objects together. Every database starts with a `public` schema by default.

### 🌍 When You'll Use This in the Real World

- **Multi-tenant applications**: Use one schema per tenant (`tenant_acme`, `tenant_beta`) to isolate data while sharing a single database instance and connection pool.
- **Microservices sharing a database**: Give each service its own schema (`orders`, `inventory`, `users`) to enforce ownership boundaries without running separate databases.
- **Versioned APIs**: Maintain `api_v1` and `api_v2` schemas with views that expose stable interfaces over evolving underlying tables.
- **Separation of concerns**: Keep `app`, `audit`, `analytics`, and `staging` schemas to partition operational, auditing, reporting, and ETL objects.

### Schema Hierarchy

```
PostgreSQL Cluster
└── Database: my_app
    ├── Schema: public          ← default, visible by default
    ├── Schema: app             ← application tables
    ├── Schema: audit           ← audit/history tables
    ├── Schema: analytics       ← reporting views & aggregates
    └── Schema: staging         ← ETL staging area
```

### Schema vs Database

| Feature | Schema | Database |
|---|---|---|
| Cross-object joins | ✅ Easy — same connection | ❌ Requires foreign data wrappers |
| Connection isolation | Shared connection | Separate connection required |
| Access control | Per-schema GRANT | Per-database permissions |
| Use case | Logical grouping | Full isolation (different apps) |

### Working with Schemas

```sql
-- Create a schema
CREATE SCHEMA app;
CREATE SCHEMA audit;

-- Create a schema and assign ownership
CREATE SCHEMA analytics AUTHORIZATION reporting_user;

-- Create a table in a specific schema
CREATE TABLE app.users (
  id    BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);

-- Reference objects across schemas (same database)
SELECT u.email, o.total
FROM app.users u
JOIN orders.invoices o ON o.user_id = u.id;

-- Drop a schema and everything in it
DROP SCHEMA staging CASCADE;
```

### The search_path

`search_path` controls which schemas Postgres looks in when you use an unqualified name (e.g., `users` instead of `app.users`):

```sql
-- Show current search path
SHOW search_path;
-- Default: "$user", public

-- Set for the current session
SET search_path = app, public;

-- Set permanently for a role
ALTER ROLE app_user SET search_path = app, public;

-- Set for a database
ALTER DATABASE my_app SET search_path = app, public;
```

> **Gotcha**: The default `public` schema is writable by all users. Always restrict it:
> `REVOKE CREATE ON SCHEMA public FROM PUBLIC;`

### Information Schema & Catalog Queries

```sql
-- List all schemas
SELECT schema_name FROM information_schema.schemata;

-- List tables in a schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'app';

-- Same via pg_catalog (faster for large systems)
SELECT tablename FROM pg_tables WHERE schemaname = 'app';

-- Show all objects in a schema
SELECT n.nspname AS schema, c.relname AS name, c.relkind AS type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'app'
ORDER BY c.relkind, c.relname;
```

`relkind` values: `r` = table, `i` = index, `v` = view, `m` = materialized view, `S` = sequence, `f` = foreign table.

### Schema Permissions

```sql
-- Grant usage (allow seeing the schema)
GRANT USAGE ON SCHEMA app TO app_user;

-- Grant all future tables in schema to a role
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- Grant sequence usage (needed for SERIAL/BIGSERIAL inserts)
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- Read-only analytics role
GRANT USAGE ON SCHEMA app, analytics TO analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO analyst;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT SELECT ON TABLES TO analyst;
```

### Multi-Tenant Schema Pattern

```sql
-- Function to create a new tenant schema
CREATE OR REPLACE FUNCTION create_tenant(tenant_name TEXT) RETURNS VOID AS $
BEGIN
  EXECUTE format('CREATE SCHEMA %I', tenant_name);
  EXECUTE format('CREATE TABLE %I.users (id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL)', tenant_name);
  EXECUTE format('CREATE TABLE %I.orders (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL)', tenant_name);
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO app_user', tenant_name);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO app_user', tenant_name);
END;
$ LANGUAGE plpgsql;

-- Usage
SELECT create_tenant('acme_corp');
SELECT create_tenant('beta_inc');
```

### Best Practices

- **Always qualify object names** in migrations and scripts: `app.users`, not just `users`.
- **Restrict `public` schema**: Remove default CREATE privileges to prevent accidental pollution.
- **Use `search_path` per role**: Set it at the role level, not in application connection strings.
- **Separate concerns**: Keep audit tables, staging tables, and analytics views in their own schemas — never mix everything in `public`.
- **Avoid too many schemas**: More than ~20 schemas per database starts to create management overhead. For massive multi-tenancy, consider row-level security instead.

---

## 3. Data Integrity & Constraints

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

## 4. Domain Types

A **domain** is a named data type built on top of an existing base type, with optional constraints attached directly to the type. Wherever the domain is used as a column type, those constraints are automatically enforced — without repeating `CHECK` clauses on every table.

### 🌍 When You'll Use This in the Real World

- Enforcing email format validation across dozens of tables without copy-pasting the same regex `CHECK` constraint everywhere.
- Defining `positive_int` or `non_negative_numeric` as canonical types that self-document intent and prevent negative prices, quantities, or ages.
- Standardizing US ZIP codes, phone numbers, ISO country codes, or percentage values across a shared schema used by multiple applications.
- Making ALTER TABLE migrations easier — change the domain once, and all columns using it inherit the updated constraint.

### Creating a Domain

```sql
-- Syntax
CREATE DOMAIN domain_name AS base_type
  [ DEFAULT expression ]
  [ CONSTRAINT constraint_name ] CHECK (VALUE <condition>)
  [ NOT NULL ];

-- Examples
CREATE DOMAIN email_address AS text
  CHECK (VALUE ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$');

CREATE DOMAIN positive_int AS integer
  CHECK (VALUE > 0);

CREATE DOMAIN non_negative_numeric AS numeric(15,4)
  CHECK (VALUE >= 0);

CREATE DOMAIN us_zip AS text
  CHECK (VALUE ~ '^\d{5}(-\d{4})?$');

CREATE DOMAIN iso_country_code AS char(2)
  CHECK (VALUE ~ '^[A-Z]{2}$');

CREATE DOMAIN percentage AS numeric(5,2)
  DEFAULT 0
  CHECK (VALUE BETWEEN 0 AND 100);
```

### Using Domains in Table Definitions

```sql
CREATE TABLE users (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email       email_address NOT NULL UNIQUE,
    signup_date date NOT NULL DEFAULT current_date
);

CREATE TABLE products (
    id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    price    non_negative_numeric NOT NULL,
    quantity positive_int NOT NULL,
    discount percentage DEFAULT 0
);

CREATE TABLE addresses (
    id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    zip     us_zip,
    country iso_country_code NOT NULL
);
```

Any INSERT or UPDATE that violates the domain constraint fails immediately with a clear error message that identifies the domain name.

### Adding and Altering Domain Constraints

```sql
-- Add a new constraint to an existing domain
ALTER DOMAIN email_address
  ADD CONSTRAINT email_not_empty CHECK (length(VALUE) > 0);

-- Drop a constraint by name
ALTER DOMAIN email_address
  DROP CONSTRAINT email_not_empty;

-- Set or drop a default
ALTER DOMAIN percentage SET DEFAULT 0;
ALTER DOMAIN percentage DROP DEFAULT;

-- Make the domain NOT NULL
ALTER DOMAIN positive_int SET NOT NULL;
ALTER DOMAIN positive_int DROP NOT NULL;
```

When you add a constraint to a domain with `NOT VALID`, existing rows are not checked immediately:

```sql
ALTER DOMAIN email_address
  ADD CONSTRAINT email_no_plus CHECK (VALUE NOT LIKE '%+%') NOT VALID;

-- Validate existing data separately (acquires a weaker lock)
ALTER DOMAIN email_address VALIDATE CONSTRAINT email_no_plus;
```

### Dropping a Domain

```sql
-- Fails if any column still uses the domain
DROP DOMAIN email_address;

-- Cascade: converts all columns back to the base type, drops constraints
DROP DOMAIN email_address CASCADE;
```

### Inspecting Domains

```sql
-- List all domains in the current schema
SELECT
    t.typname AS domain_name,
    pg_catalog.format_type(t.typbasetype, t.typtypmod) AS base_type,
    t.typdefault AS default_value,
    c.conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_def
FROM pg_type t
LEFT JOIN pg_constraint c ON c.contypid = t.oid
WHERE t.typtype = 'd'
  AND t.typnamespace = 'public'::regnamespace
ORDER BY t.typname, c.conname;
```

### Domains vs CHECK Constraints — When to Choose Which

| Factor | Domain | Per-column CHECK |
|--------|--------|-----------------|
| Reused across many tables | Ideal | Verbose, copy-paste drift |
| Single-table, one-off rule | Overkill | Appropriate |
| Self-documenting type name | Yes — the type name is the documentation | No |
| Migration: change the rule | One ALTER DOMAIN | Must find and alter every table |
| Error message clarity | Mentions domain name | Generic |
| Performance | Identical | Identical |
| Function parameter validation | Can use domain as parameter type | Cannot |

### Domains as Function Parameter Types

```sql
-- Domain used as a parameter type gives free input validation
CREATE FUNCTION send_welcome_email(addr email_address) RETURNS void
  LANGUAGE plpgsql AS $$
BEGIN
  -- addr is guaranteed to be a valid email here
  PERFORM pg_notify('email_queue', addr::text);
END;
$$;

-- This will fail before the function body even runs:
SELECT send_welcome_email('not-an-email');
-- ERROR: value for domain email_address violates check constraint
```

### Best Practices

- Name domains after what they represent, not how they are stored (`email_address` not `email_text`).
- Always name domain constraints explicitly so error messages and migrations are readable.
- Use `NOT VALID` + `VALIDATE CONSTRAINT` when adding constraints to an existing high-traffic domain to avoid a full table scan under lock.
- Do not create domains for types used in only one place — a plain `CHECK` constraint is simpler there.
- Domains compose: you can create a domain on top of another domain, inheriting its constraints and adding more.

---

## 5. NULL Handling & COALESCE Patterns

`NULL` in SQL is not a value — it is a marker for an unknown or inapplicable value. This distinction has profound implications for query logic because `NULL` propagates through almost all expressions and comparisons in ways that violate ordinary two-valued Boolean logic. Misunderstanding `NULL` is one of the most common sources of silent bugs in SQL.

### 🌍 When You'll Use This in the Real World

- A `WHERE email != 'admin@example.com'` filter silently excludes all users with `NULL` email addresses.
- A `COUNT(column)` returns a different number than `COUNT(*)` because the column has NULLs.
- A `NOT IN (subquery)` returns zero rows because the subquery contains a NULL.
- A `UNIQUE` constraint allows multiple NULL values — this surprises many developers.
- A LEFT JOIN with a WHERE clause on the right-side column accidentally becomes an INNER JOIN.

### Three-Valued Logic

SQL uses three-valued logic: `TRUE`, `FALSE`, and `UNKNOWN` (which is what NULL comparisons produce). Any expression that involves NULL evaluates to `UNKNOWN`, and `UNKNOWN` is treated as `FALSE` in a `WHERE` clause:

```sql
SELECT NULL = NULL;      -- NULL (not TRUE!)
SELECT NULL != NULL;     -- NULL
SELECT NULL = 1;         -- NULL
SELECT NULL IS NULL;     -- TRUE  (use IS NULL, not = NULL)
SELECT NULL IS NOT NULL; -- FALSE

-- Three-valued logic table for AND
-- TRUE  AND NULL = NULL (unknown)
-- FALSE AND NULL = FALSE (false wins for AND)
-- NULL  AND NULL = NULL

-- Three-valued logic table for OR
-- TRUE  OR NULL = TRUE (true wins for OR)
-- FALSE OR NULL = NULL (unknown)
-- NULL  OR NULL = NULL

SELECT TRUE AND NULL;    -- NULL
SELECT FALSE AND NULL;   -- FALSE
SELECT TRUE OR NULL;     -- TRUE
SELECT FALSE OR NULL;    -- NULL
```

### `IS NULL` vs `= NULL`

```sql
-- WRONG: always returns no rows
SELECT * FROM users WHERE deleted_at = NULL;

-- CORRECT
SELECT * FROM users WHERE deleted_at IS NULL;
SELECT * FROM users WHERE deleted_at IS NOT NULL;

-- IS DISTINCT FROM / IS NOT DISTINCT FROM treat NULL as a comparable value
SELECT NULL IS DISTINCT FROM NULL;       -- FALSE (they are not distinct)
SELECT 1 IS DISTINCT FROM NULL;          -- TRUE
SELECT NULL IS NOT DISTINCT FROM NULL;   -- TRUE

-- Useful for "changed value" detection
SELECT * FROM audit_log
WHERE old_value IS DISTINCT FROM new_value;  -- works even if either is NULL
```

### `COALESCE` — Return the First Non-NULL Value

```sql
-- COALESCE(a, b, c, ...) returns the first non-NULL argument
SELECT COALESCE(NULL, NULL, 3, 4);     -- 3
SELECT COALESCE(display_name, username, email, 'Anonymous') FROM users;

-- Common use: default value substitution
SELECT id, COALESCE(phone, 'N/A') AS phone FROM contacts;

-- In calculations: prevent NULL propagation
SELECT COALESCE(price, 0) * COALESCE(quantity, 0) AS line_total FROM order_items;

-- IMPORTANT: COALESCE is short-circuit evaluated; later args are not evaluated
-- if an earlier arg is non-NULL. Useful for expensive fallbacks.
SELECT COALESCE(cached_value, expensive_function(id)) FROM items;
```

### `NULLIF` — Return NULL if Two Values Are Equal

```sql
-- NULLIF(a, b) returns NULL if a = b, otherwise returns a
-- This is the inverse of COALESCE

-- Prevent division by zero
SELECT total_revenue / NULLIF(total_orders, 0) AS avg_order_value FROM metrics;

-- Treat empty string as NULL
SELECT NULLIF(trim(phone), '') AS phone FROM contacts;

-- Convert sentinel values to NULL
SELECT NULLIF(status, -1) AS status FROM legacy_jobs;  -- -1 was used for "no status"
```

### `GREATEST` and `LEAST`

Unlike most aggregate functions, `GREATEST` and `LEAST` are scalar functions that take multiple arguments. They ignore NULLs — but return NULL if ALL arguments are NULL:

```sql
SELECT GREATEST(3, 1, 4, 1, 5, 9);     -- 9
SELECT LEAST(3, 1, 4, 1, 5, 9);         -- 1

SELECT GREATEST(NULL, 5, NULL);          -- 5 (ignores NULLs)
SELECT GREATEST(NULL, NULL, NULL);       -- NULL (all NULL)

-- Clamp a value to a range
SELECT GREATEST(0, LEAST(score, 100)) AS clamped_score FROM submissions;

-- Use in UPDATE to only increase a counter
UPDATE products
SET view_count = GREATEST(view_count, new_count)
WHERE id = 42;
```

### NULL in Aggregates

Aggregate functions (`SUM`, `AVG`, `MIN`, `MAX`, `COUNT`) ignore NULLs — except `COUNT(*)` which counts all rows:

```sql
SELECT
    COUNT(*)           AS total_rows,       -- counts all rows
    COUNT(email)       AS rows_with_email,  -- excludes NULL email rows
    COUNT(DISTINCT email) AS unique_emails, -- excludes NULLs and duplicates
    SUM(amount)        AS total,            -- NULLs ignored
    AVG(amount)        AS avg,              -- NULLs ignored (sum/non-null-count)
    COALESCE(SUM(amount), 0) AS safe_total  -- returns 0 if all amounts are NULL
FROM payments;

-- AVG can surprise you: avg(1, 2, NULL) = 1.5, not 1.0
SELECT AVG(val) FROM (VALUES (1), (2), (NULL)) t(val);   -- 1.5
```

### NULL in ORDER BY

NULL values are treated as larger than any non-NULL value by default in PostgreSQL (i.e., `NULLS LAST` for `ASC`, `NULLS FIRST` for `DESC`):

```sql
-- Control NULL placement explicitly
SELECT name, score FROM leaderboard ORDER BY score DESC NULLS LAST;
SELECT name, created_at FROM tasks ORDER BY created_at ASC NULLS FIRST;
```

### NULL in UNIQUE Constraints

PostgreSQL follows the SQL standard: NULL is not equal to NULL, so a `UNIQUE` constraint allows multiple NULL values in the same column:

```sql
CREATE TABLE users (email text UNIQUE);

INSERT INTO users (email) VALUES (NULL);  -- OK
INSERT INTO users (email) VALUES (NULL);  -- Also OK! NULL != NULL in UNIQUE checks
INSERT INTO users (email) VALUES ('a@b.com');
INSERT INTO users (email) VALUES ('a@b.com');  -- ERROR: duplicate key

-- If you want at most one NULL, use a partial unique index:
CREATE UNIQUE INDEX uq_users_email_not_null ON users (email) WHERE email IS NOT NULL;
-- Plus a separate check: do not allow more than one row with NULL email
-- (requires application logic or a partial index trick)

-- PostgreSQL 15+: NULLS NOT DISTINCT
CREATE TABLE users_pg15 (email text UNIQUE NULLS NOT DISTINCT);
INSERT INTO users_pg15 VALUES (NULL);
INSERT INTO users_pg15 VALUES (NULL);  -- ERROR: duplicate key (nulls treated as equal)
```

### NULL Traps in JOINs and WHERE Clauses

**The NOT IN + NULL trap:**
```sql
-- Assume orders.customer_id can be NULL
-- This returns ZERO rows if any customer_id in orders is NULL:
SELECT * FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);

-- Safe alternatives:
SELECT * FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);

-- Or filter out NULLs explicitly:
SELECT * FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL);
```

**The LEFT JOIN + WHERE trap:**
```sql
-- This looks like a LEFT JOIN but is actually an INNER JOIN
-- because the WHERE filters out NULLs from the right side:
SELECT c.name, o.total
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'completed';    -- customers with no orders are excluded!

-- Correct: move the filter into the JOIN condition
SELECT c.name, o.total
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'completed';
```

### Best Practices

- Always use `IS NULL` / `IS NOT NULL` — never `= NULL` or `!= NULL`.
- Use `IS DISTINCT FROM` when comparing two values that might both be NULL (e.g., detecting changes in audit triggers).
- Use `COALESCE` to substitute defaults at the point of use; use `DEFAULT` clause on columns to set database-level defaults.
- Use `NULLIF` to guard against division by zero and to canonicalize sentinel values to NULL.
- Avoid `NOT IN` with subqueries that might return NULLs; prefer `NOT EXISTS`.
- When doing a LEFT JOIN, ensure any WHERE filter on the right table is moved into the ON clause if you want to preserve unmatched left rows.
- Design schemas so that NULLs are meaningful and intentional — a NULL should mean "unknown" or "not applicable," not "we forgot to fill this in."

---

## 6. Time & Date Types

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

## 7. Numeric & ID Types

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

## 8. Sequences & Identity Columns

Sequences are PostgreSQL objects that generate unique integer values in order. They are the mechanism behind auto-increment primary keys. Understanding sequences directly — not just the sugar syntax around them — lets you control gaps, reset counters, share sequences across tables, and reason about behavior under concurrency.

### 🌍 When You'll Use This in the Real World

- Every table with an auto-increment primary key uses a sequence under the hood.
- Generating sequential invoice numbers, order numbers, or ticket IDs that must be gapless (or close to it).
- Sharing a single counter across multiple tables when all IDs must be globally unique within a system.
- Resetting or advancing a sequence after a bulk data migration.
- Diagnosing why your `SERIAL` column is approaching the 2.1 billion integer limit.

### `CREATE SEQUENCE`

```sql
CREATE SEQUENCE order_number_seq
    START WITH 1000        -- first value returned
    INCREMENT BY 1         -- step size (can be negative for descending)
    MINVALUE 1000          -- lower bound
    MAXVALUE 9999999       -- upper bound
    CACHE 10               -- pre-allocate 10 values per session (faster, more gaps)
    NO CYCLE;              -- raise error when exhausted (default)
    -- CYCLE would wrap back to MINVALUE

-- Descending sequence
CREATE SEQUENCE countdown_seq
    START WITH 100
    INCREMENT BY -1
    MINVALUE 1
    MAXVALUE 100
    CYCLE;
```

### Sequence Functions

```sql
-- Advance and return next value (modifies the sequence)
SELECT nextval('order_number_seq');   -- 1000, then 1001, etc.

-- Return the last value returned by nextval IN THIS SESSION
SELECT currval('order_number_seq');   -- ERROR if nextval not yet called

-- Return the last value returned by ANY nextval call in this session
SELECT lastval();

-- Set the current position (setval does NOT advance; next nextval returns start+increment)
SELECT setval('order_number_seq', 5000);          -- next nextval → 5001
SELECT setval('order_number_seq', 5000, false);   -- next nextval → 5000 (is_called=false)

-- Inspect the sequence
SELECT * FROM order_number_seq;
-- Or using the catalog:
SELECT last_value, is_called FROM order_number_seq;
```

### `SERIAL` / `BIGSERIAL` — Legacy Sugar

`SERIAL` and `BIGSERIAL` are shorthand that create a sequence and attach it to the column. They are still widely used but are considered legacy in PostgreSQL 10+:

```sql
-- SERIAL expands to:
CREATE TABLE orders (id SERIAL PRIMARY KEY);
-- Which is equivalent to:
CREATE SEQUENCE orders_id_seq;
CREATE TABLE orders (id integer NOT NULL DEFAULT nextval('orders_id_seq'));
ALTER SEQUENCE orders_id_seq OWNED BY orders.id;

-- BIGSERIAL uses bigint (recommended over SERIAL)
CREATE TABLE events (id BIGSERIAL PRIMARY KEY);
```

**Problems with SERIAL:**
- It is not SQL-standard.
- The sequence ownership is implicit and confusing in dumps/restores.
- `ALTER TABLE ... ADD COLUMN id SERIAL` behaves differently from `IDENTITY`.
- Permissions on the sequence must be granted separately from the table.

### `GENERATED ... AS IDENTITY` — The Modern Standard

PostgreSQL 10+ supports the SQL-standard `IDENTITY` column syntax. This is the recommended approach for all new tables:

```sql
-- GENERATED ALWAYS AS IDENTITY
-- The database always generates the value; you cannot INSERT a manual value
-- (unless you use OVERRIDING SYSTEM VALUE)
CREATE TABLE invoices (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_no  text NOT NULL,
    total       numeric(12,2)
);

INSERT INTO invoices (invoice_no, total) VALUES ('INV-001', 500.00);
-- id is automatically assigned

-- Override is possible but explicit:
INSERT INTO invoices (id, invoice_no, total)
OVERRIDING SYSTEM VALUE
VALUES (9999, 'INV-MANUAL', 0);

-- GENERATED BY DEFAULT AS IDENTITY
-- Allows supplying a value manually (behaves more like SERIAL but SQL-standard)
CREATE TABLE legacy_import (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    data text
);

INSERT INTO legacy_import (id, data) VALUES (42, 'migrated row');  -- explicit id OK
```

### Controlling the Underlying Sequence via IDENTITY

```sql
-- Access sequence options through the column definition
CREATE TABLE tickets (
    id bigint GENERATED ALWAYS AS IDENTITY (
        START WITH 10000
        INCREMENT BY 1
        CACHE 50
    ) PRIMARY KEY,
    subject text NOT NULL
);

-- Alter the sequence of an identity column
ALTER TABLE tickets ALTER COLUMN id
    SET GENERATED ALWAYS
    SET (START WITH 20000, INCREMENT BY 1);

-- Restart the sequence
ALTER TABLE tickets ALTER COLUMN id RESTART WITH 20000;
```

### Sequence Gaps — Why They Happen and When to Care

Sequences are designed for **performance, not gaplessness**. Gaps occur because:

1. **Transactions rolled back** — `nextval` is non-transactional; the value is consumed even if the INSERT is rolled back.
2. **Cache pre-allocation** — with `CACHE N`, each backend pre-allocates N values. If the backend exits without using them all, those values are lost.
3. **Crashes** — cached sequence values are lost on server restart.

```sql
-- Demonstrate gap due to rollback
BEGIN;
INSERT INTO orders (customer_id) VALUES (1);  -- consumes id=1
ROLLBACK;
INSERT INTO orders (customer_id) VALUES (2);  -- gets id=2 (gap at 1)

-- Check for gaps (expensive on large tables)
SELECT id + 1 AS gap_start
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = o.id + 1)
  AND id < (SELECT max(id) FROM orders)
ORDER BY id;
```

**When gaps matter:** Invoice numbers in some jurisdictions must be sequential and gapless for tax compliance. In that case, do not use sequences — use an advisory lock or a separate counter table with a transaction:

```sql
-- Gapless counter using a dedicated table + row lock
CREATE TABLE counters (name text PRIMARY KEY, value bigint NOT NULL DEFAULT 0);
INSERT INTO counters (name) VALUES ('invoice_no');

-- In a transaction:
BEGIN;
UPDATE counters SET value = value + 1 WHERE name = 'invoice_no';
SELECT value FROM counters WHERE name = 'invoice_no';  -- use this as the invoice number
INSERT INTO invoices (...) VALUES (...);
COMMIT;
```

### Sharing a Sequence Across Multiple Tables

```sql
CREATE SEQUENCE global_entity_id_seq START WITH 1;

CREATE TABLE customers (
    id      bigint DEFAULT nextval('global_entity_id_seq') PRIMARY KEY,
    name    text
);

CREATE TABLE vendors (
    id      bigint DEFAULT nextval('global_entity_id_seq') PRIMARY KEY,
    name    text
);

-- IDs are now globally unique across both tables
```

### Inspecting Sequences

```sql
-- All sequences in the current database
SELECT schemaname, sequencename, start_value, min_value, max_value,
       increment_by, cycle, cache_size, last_value
FROM pg_sequences
WHERE schemaname = 'public';

-- Find sequences approaching their maximum
SELECT sequencename,
       last_value,
       max_value,
       round(100.0 * last_value / max_value, 2) AS pct_used
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY pct_used DESC;
```

### Best Practices

- Always use `bigint GENERATED ALWAYS AS IDENTITY` for new tables. Never use `SERIAL` (32-bit, legacy) or plain `SERIAL` which maxes at ~2.1 billion.
- Set `CACHE 1` on sequences that must minimize gaps; accept higher `CACHE` values for high-throughput tables that can tolerate gaps.
- Monitor sequence usage percentage (`pg_sequences.last_value / max_value`) — a sequence hitting its max causes INSERT failures.
- Do not use sequences for gapless business numbers (invoice IDs, receipt numbers). Use a locked counter table instead.
- After bulk data migrations, always call `setval` or `ALTER ... RESTART WITH` so the next generated value does not collide with imported data.

---

## 9. String & Text Types

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

## 10. Character Sets, Collations & Encoding

Every PostgreSQL database is created with an **encoding** (how characters are stored as bytes) and a **default collation** (how strings are sorted and compared). These settings affect index types, sort order, case-sensitivity, and compatibility with client applications. Getting them wrong at creation time is painful to fix later.

### 🌍 When You'll Use This in the Real World

- Internationalizing an application that stores names, addresses, or content in multiple languages.
- Building case-insensitive login or search features where `user@EXAMPLE.COM` must match `user@example.com`.
- Diagnosing why a query using `LIKE 'abc%'` stopped using an index after a database migration.
- Dealing with corrupted text after a client application connected in Latin-1 to a UTF-8 database.
- Implementing locale-aware sorting where `ä` should sort near `a` in German but after `z` in traditional Swedish.

### Database Encoding

The encoding is set at `CREATE DATABASE` time and cannot be changed without a dump-and-restore:

```sql
-- Create a UTF-8 database (strongly recommended for all new databases)
CREATE DATABASE myapp
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;   -- template0 required when specifying non-default locale

-- Check the encoding of the current database
SHOW server_encoding;
SELECT pg_encoding_to_char(encoding), datcollate, datctype
FROM pg_database WHERE datname = current_database();
```

| Encoding | Notes |
|----------|-------|
| `UTF8` | Universal. Store any language. Only correct choice for new databases. |
| `SQL_ASCII` | Dangerous: no encoding enforcement; bytes pass through unchanged. Use only for pure ASCII data where you control all clients. |
| `LATIN1` (ISO-8859-1) | Western European legacy. Cannot store CJK, Arabic, etc. |
| `WIN1252` | Windows Western European legacy. Common in migrated databases. |

### The `COLLATE` Clause

A collation defines the rules for string comparison (`=`, `<`, `>`, `LIKE`, `ORDER BY`). It can be specified at three levels:

```sql
-- 1. Column level
CREATE TABLE users (
    name text COLLATE "en_US.UTF-8"
);

-- 2. Expression level (overrides column collation for that expression only)
SELECT * FROM users ORDER BY name COLLATE "C";

-- 3. Index level (index can only be used by queries with matching collation)
CREATE INDEX idx_users_name_ci ON users (name COLLATE "und-x-icu");
```

### Case-Insensitive Collations with ICU

PostgreSQL 12+ supports ICU (International Components for Unicode) collations, which enable true locale-aware case-insensitive and accent-insensitive comparisons:

```sql
-- Create a case-insensitive collation using ICU (PostgreSQL 12+)
CREATE COLLATION case_insensitive (
    provider = icu,
    locale = 'und-x-icu',        -- 'und' = undetermined locale (language-agnostic)
    deterministic = false         -- required for case-insensitive behavior
);

-- Use it on a column
CREATE TABLE accounts (
    email text COLLATE case_insensitive UNIQUE
);

-- Now these are considered equal:
INSERT INTO accounts (email) VALUES ('Alice@Example.COM');
INSERT INTO accounts (email) VALUES ('alice@example.com');  -- ERROR: duplicate key!

-- And this index is used by case-insensitive comparisons:
CREATE INDEX idx_accounts_email ON accounts (email);  -- inherits column collation
SELECT * FROM accounts WHERE email = 'ALICE@EXAMPLE.COM';  -- uses the index
```

**Before ICU collations**, the canonical workaround was `citext` extension or functional indexes:
```sql
-- Legacy approach: functional index on lower()
CREATE INDEX idx_users_email_lower ON users (lower(email));
SELECT * FROM users WHERE lower(email) = lower('Alice@Example.COM');

-- Or use the citext extension
CREATE EXTENSION citext;
CREATE TABLE users (email citext UNIQUE);
```

### Accent-Insensitive Collations

```sql
-- Accent-insensitive AND case-insensitive
CREATE COLLATION accent_insensitive (
    provider = icu,
    locale = 'und-u-ks-level1',  -- level1 ignores case AND accents
    deterministic = false
);

CREATE TABLE products (name text COLLATE accent_insensitive);
-- Now 'cafe' matches 'café' and 'CAFÉ'
```

### The `C` and `POSIX` Collations

`C` (or `POSIX`) is a special collation that compares strings byte-by-byte. It is the fastest collation and the only one that supports the B-tree index optimization for `LIKE 'prefix%'` patterns without the `pg_trgm` extension:

```sql
-- LIKE prefix search only uses a B-tree index when collation is C
CREATE INDEX idx_users_name_c ON users (name COLLATE "C");
SELECT * FROM users WHERE name LIKE 'John%' COLLATE "C";

-- With a locale-aware collation, you need a trigram index for LIKE
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
SELECT * FROM users WHERE name LIKE '%John%';
```

### Inspecting Collations

```sql
-- List all available collations
SELECT collname, collprovider, collisdeterministic, colllocale
FROM pg_collation
ORDER BY collname;

-- Find collations for a specific locale
SELECT collname FROM pg_collation WHERE collname LIKE '%en_US%';

-- Check collation of a specific column
SELECT column_name, collation_name
FROM information_schema.columns
WHERE table_name = 'users';
```

### Common Encoding Pitfalls

**Mismatch between client and server encoding:**
```sql
-- Check client encoding
SHOW client_encoding;

-- Set client encoding for the session
SET client_encoding = 'UTF8';

-- Or in connection string
psql "dbname=myapp client_encoding=UTF8"
```

**Cannot store certain characters:**
```sql
-- In a LATIN1 database, this fails:
INSERT INTO messages (body) VALUES ('Hello 🌍');   -- emoji is outside Latin-1

-- Solution: Only use UTF-8 databases for new projects.
```

**`LIKE` index not used after locale change:**
A B-tree index built with locale `en_US.UTF-8` will NOT support `LIKE 'prefix%'` scans. If you need prefix LIKE scanning with a locale collation, use a trigram index or switch the column to `COLLATE "C"`.

### Best Practices

- Always create databases with `ENCODING = 'UTF8'`. There is no good reason to use anything else for new databases in 2024.
- Use ICU collations (`deterministic = false`) for case-insensitive columns in PostgreSQL 12+. They are more correct than `citext` and support proper Unicode folding.
- Use `COLLATE "C"` on columns where you need fast prefix `LIKE` scans and do not need locale-aware sorting.
- Store the collation choice in your migration scripts so it is reproducible across environments.
- Never mix encodings in a replication setup.

---

## 11. Casting & Type Conversion

PostgreSQL is a strongly typed database — every value has a declared type, and operations between mismatched types require an explicit or implicit conversion. Understanding the casting system lets you write correct, predictable SQL and avoid subtle runtime errors and silent precision loss.

### 🌍 When You'll Use This in the Real World

- Reading data from `TEXT` columns in legacy schemas and converting to numeric or date types for calculations.
- Handling JSON fields where values arrive as `text` but need to be treated as `integer`, `boolean`, or `timestamptz`.
- Writing generic utility functions that accept `anyelement` and need to cast internally.
- Debugging "operator does not exist" errors where PostgreSQL refuses an implicit cast.
- Building reporting queries that format numbers, dates, or enums as displayable strings.

### Implicit vs Explicit Casting

PostgreSQL attempts **implicit casts** automatically when the source and target types have a defined implicit cast path in the system catalog. If none exists, the query fails unless you add an explicit cast.

```sql
-- Implicit: integer literal assigned to bigint column — fine
INSERT INTO orders (quantity) VALUES (42);

-- Implicit: integer → numeric in arithmetic — fine
SELECT 10 / 3.0;   -- 3.3333...

-- NO implicit cast from text → integer in expressions
SELECT '42' + 1;   -- ERROR: operator does not exist: text + integer

-- Explicit cast required
SELECT '42'::integer + 1;   -- 43
SELECT CAST('42' AS integer) + 1;   -- 43 (SQL-standard syntax)
```

PostgreSQL defines three cast contexts in `pg_cast.castcontext`:
| Context | Symbol | Meaning |
|---------|--------|---------|
| `i` | implicit | Applied automatically by the planner anywhere |
| `a` | assignment | Applied automatically on INSERT/UPDATE to match column type |
| `e` | explicit | Only applied when the cast is written by the user |

### `CAST(x AS type)` and `x::type` Syntax

Both are functionally identical. `::` is PostgreSQL-specific and more concise; `CAST()` is SQL-standard and preferred in portable code.

```sql
-- Equivalent forms
SELECT CAST('2024-01-15' AS date);
SELECT '2024-01-15'::date;

-- Chaining casts
SELECT '3.14'::text::numeric::integer;   -- 3

-- Casting in column definitions / expressions
SELECT price::numeric(10,2) FROM products;

-- Casting NULL
SELECT NULL::integer;   -- NULL of type integer
```

### Common Cast Pitfalls

**`text` → `integer` — truncation vs error**
```sql
SELECT '42abc'::integer;   -- ERROR: invalid input syntax
SELECT '42.9'::integer;    -- ERROR: use numeric first, then cast
SELECT '42.9'::numeric::integer;   -- 43  (rounds)
SELECT trunc('42.9'::numeric)::integer;   -- 42 (truncates)
```

**`timestamp` → `date` — timezone trap**
```sql
-- timestamptz → date uses the SESSION timezone
SET timezone = 'UTC';
SELECT '2024-01-15 23:00:00+00'::timestamptz::date;   -- 2024-01-15

SET timezone = 'America/New_York';
SELECT '2024-01-15 23:00:00+00'::timestamptz::date;   -- 2024-01-15
-- But at 2024-01-15 02:00:00 UTC with New York offset it would be 2024-01-14!

-- Always cast through AT TIME ZONE when the timezone matters
SELECT ('2024-01-15 23:00:00+00'::timestamptz AT TIME ZONE 'UTC')::date;
```

**`float` → `numeric` — precision loss**
```sql
SELECT 0.1::float8::numeric;
-- 0.1000000000000000055511151231257827021181583404541015625
-- Floats cannot represent 0.1 exactly; casting to numeric preserves the binary imprecision.

-- Correct pattern: round explicitly
SELECT round(0.1::float8::numeric, 2);   -- 0.10
```

**`integer` division — no automatic promotion**
```sql
SELECT 7 / 2;          -- 3   (integer division, truncates)
SELECT 7 / 2.0;        -- 3.5 (one operand is numeric)
SELECT 7::numeric / 2; -- 3.5
```

**`boolean` text representation**
```sql
SELECT 'true'::boolean;    -- t
SELECT 'yes'::boolean;     -- t
SELECT '1'::boolean;       -- t
SELECT 'on'::boolean;      -- t
SELECT 'false'::boolean;   -- f
SELECT 'off'::boolean;     -- f
-- All of the above are valid boolean text literals in PostgreSQL
```

### Custom Cast Functions

You can define your own casts between user-defined types or between built-in types where no system cast exists.

```sql
-- 1. Create a domain or composite type
CREATE DOMAIN us_zip AS text CHECK (VALUE ~ '^\d{5}(-\d{4})?$');

-- 2. Create a function that performs the conversion
CREATE FUNCTION text_to_us_zip(text) RETURNS us_zip
  LANGUAGE sql STRICT IMMUTABLE AS
$$SELECT $1::us_zip$$;

-- 3. Register the cast
CREATE CAST (text AS us_zip)
  WITH FUNCTION text_to_us_zip(text)
  AS ASSIGNMENT;   -- applies automatically on INSERT/UPDATE

-- Now this works without explicit cast:
INSERT INTO addresses (zip) VALUES ('94107');
```

### Inspecting the `pg_cast` Catalog

```sql
-- List all casts from a given source type
SELECT
    t1.typname AS source_type,
    t2.typname AS target_type,
    c.castcontext,
    p.proname AS cast_function
FROM pg_cast c
JOIN pg_type t1 ON t1.oid = c.castsource
JOIN pg_type t2 ON t2.oid = c.casttarget
LEFT JOIN pg_proc p ON p.oid = c.castfunc
WHERE t1.typname = 'text'
ORDER BY t2.typname;

-- Find implicit casts that the planner can use automatically
SELECT t1.typname AS from_type, t2.typname AS to_type
FROM pg_cast c
JOIN pg_type t1 ON t1.oid = c.castsource
JOIN pg_type t2 ON t2.oid = c.casttarget
WHERE c.castcontext = 'i'
ORDER BY 1, 2;
```

### Format Functions as an Alternative to Casting

For display purposes, `to_char()`, `to_number()`, and `to_date()` are often cleaner than raw casts because they accept format strings:

```sql
SELECT to_char(now(), 'YYYY-MM-DD HH24:MI:SS TZ');
SELECT to_char(1234567.89, 'FM$999,999,999.00');
SELECT to_number('1,234.56', '9,999.99');
SELECT to_date('15 Jan 2024', 'DD Mon YYYY');
```

### Best Practices

- Prefer `x::type` for concise PostgreSQL code; use `CAST(x AS type)` in SQL you need to port.
- Never rely on implicit text→integer casts in application queries — be explicit to catch bad data early.
- Cast `timestamptz` to `date` only after applying the correct timezone with `AT TIME ZONE`.
- Avoid `float` for anything where you later need exact `numeric` comparisons.
- Register custom casts as `ASSIGNMENT` (not `IMPLICIT`) unless you are certain the automatic conversion will never produce surprising results.

---

## 12. Binary Data & Bit Strings

PostgreSQL provides two distinct systems for raw binary data: `bytea` for opaque byte sequences (file contents, hashes, encrypted blobs) and `bit`/`bit varying` for fixed or variable-length sequences of binary digits used in flag manipulation and bitmasking.

### 🌍 When You'll Use This in the Real World

- Storing file checksums (MD5, SHA-256) as raw bytes rather than hex strings to save space and enable byte-level comparisons.
- Keeping small binary blobs (thumbnails, certificates, keys) in the database alongside their metadata.
- Using bitmask columns to represent a compact set of boolean flags (user permissions, feature toggles) without a separate join table.
- Storing opaque tokens, encrypted payloads, or serialized binary protocol data.
- Recording MAC addresses, IP prefix bitmasks, or hardware fingerprints in their native binary form.

### The `bytea` Type

`bytea` stores an arbitrary sequence of bytes with no encoding interpretation. There is no length limit (up to 1 GB per value).

```sql
CREATE TABLE files (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    filename    text NOT NULL,
    content     bytea,
    sha256_hash bytea,
    created_at  timestamptz DEFAULT now()
);

-- Insert using hex escape literals (PostgreSQL-specific)
INSERT INTO files (filename, sha256_hash)
VALUES ('report.pdf', '\xdeadbeef01020304');

-- Insert using the standard escape syntax
INSERT INTO files (filename, content)
VALUES ('hello.txt', E'\\x48656c6c6f');   -- "Hello" in hex

-- Using encode/decode
SELECT encode(sha256_hash, 'hex') FROM files;     -- output as hex string
SELECT encode(sha256_hash, 'base64') FROM files;  -- output as base64
SELECT decode('deadbeef', 'hex');                  -- hex string → bytea
SELECT decode('SGVsbG8=', 'base64');               -- base64 → bytea
```

### `bytea_output` Setting

Controls how `bytea` values are displayed when sent to clients:

```sql
-- PostgreSQL default since 9.0: hex format
SET bytea_output = 'hex';
SELECT '\x48656c6c6f'::bytea;   -- \x48656c6c6f

-- Legacy escape format (used by older clients)
SET bytea_output = 'escape';
SELECT '\x48656c6c6f'::bytea;   -- Hello
```

Always use the `hex` format (the default) for new applications. The `escape` format is difficult to parse correctly and is retained for backward compatibility only.

### Hashing and Checksums with `bytea`

```sql
-- Compute SHA-256 hash (requires pgcrypto extension)
CREATE EXTENSION pgcrypto;

UPDATE files
SET sha256_hash = digest(content, 'sha256')
WHERE content IS NOT NULL;

-- Verify integrity
SELECT filename,
       sha256_hash = digest(content, 'sha256') AS integrity_ok
FROM files;

-- Store MD5 as bytea (16 bytes, more compact than 32-char hex string)
SELECT decode(md5('hello world'), 'hex')::bytea;
```

### Bit String Types: `bit(n)` and `bit varying(n)`

`bit(n)` is a fixed-length string of exactly `n` binary digits (0 or 1). `bit varying(n)` (alias `varbit(n)`) allows up to `n` bits.

```sql
-- Fixed-length: must supply exactly n bits
CREATE TABLE permissions (
    role_id   bigint PRIMARY KEY,
    flags     bit(8) NOT NULL DEFAULT B'00000000'
);

-- Variable-length
CREATE TABLE feature_flags (
    user_id   bigint PRIMARY KEY,
    flags     bit varying(64) NOT NULL DEFAULT B''
);

-- Insert literal bit strings
INSERT INTO permissions (role_id, flags) VALUES (1, B'10110100');
INSERT INTO permissions (role_id, flags) VALUES (2, '10110100');  -- text also works

-- Hex notation
INSERT INTO permissions (role_id, flags) VALUES (3, X'B4');  -- 10110100
```

### Bitwise Operations

```sql
-- AND, OR, XOR, NOT, shift
SELECT B'10110100' & B'11110000';   -- 10110000  (AND)
SELECT B'10110100' | B'00001111';   -- 10111111  (OR)
SELECT B'10110100' # B'11110000';   -- 01000100  (XOR)
SELECT ~B'10110100';                -- 01001011  (NOT)
SELECT B'10110100' << 2;            -- 11010000  (left shift)
SELECT B'10110100' >> 2;            -- 00101101  (right shift)

-- Extract a single bit (1-indexed from the left)
SELECT get_bit(B'10110100', 0);     -- 1 (leftmost bit)
SELECT get_bit(B'10110100', 3);     -- 1

-- Set a bit
SELECT set_bit(B'10110100', 7, 1);  -- 10110101 (set rightmost bit)

-- Count set bits (popcount — useful for permission counting)
SELECT length(replace(B'10110100'::text, '0', ''));  -- 4 bits set
```

### Practical Bitmask Pattern: Permission Flags

```sql
-- Define constants as named values (use application layer or SQL functions)
-- Bit positions: 0=READ, 1=WRITE, 2=DELETE, 3=ADMIN

CREATE TABLE role_permissions (
    role_id  bigint PRIMARY KEY,
    perms    bit(8) NOT NULL DEFAULT B'00000000'
);

-- Grant READ (bit 0) and WRITE (bit 1)
UPDATE role_permissions
SET perms = set_bit(set_bit(perms, 0, 1), 1, 1)
WHERE role_id = 42;

-- Check if WRITE permission (bit 1) is set
SELECT role_id
FROM role_permissions
WHERE get_bit(perms, 1) = 1;

-- Find roles with ADMIN (bit 3) set
SELECT role_id
FROM role_permissions
WHERE (perms & B'00001000') != B'00000000';
```

### Comparison with `integer` Bitmasks

Many developers use `integer` or `bigint` for bitmasks because the syntax is more familiar. Both approaches work; the choice comes down to readability:

```sql
-- Integer bitmask approach
SELECT 0b10110100::integer;   -- 180
SELECT 180 & 240;             -- bitwise AND on integers
SELECT (perms & 8) != 0;      -- check ADMIN bit

-- bit(n) approach is more self-documenting
SELECT (perms & B'00001000') != B'00000000';
```

For most production use cases, `integer` or `bigint` bitmasks are more practical because they integrate naturally with application ORMs and languages. Use `bit(n)` when the bit-string nature of the data matters intrinsically (e.g., hardware register values, protocol frames).

### Best Practices

- Use `bytea` for all opaque binary data (file bytes, hashes, encrypted payloads). Do not store binary data as hex strings in `text` columns.
- Always keep `bytea_output = 'hex'` (the default). Only set `escape` if you have a legacy client that requires it.
- For permission flags in typical web applications, `integer` bitmasks are fine and simpler. Use `bit(n)` when the domain genuinely calls for fixed-width bit patterns.
- Index `bytea` columns used in equality lookups with a standard B-tree index — it works because `bytea` supports equality comparison.
- Never store large files (>1 MB) in `bytea` columns in the main table. Store them in object storage and keep only the URL and hash in the database.

---

## 13. Network & MAC Address Types

PostgreSQL has first-class support for network address types: `inet`, `cidr`, `macaddr`, and `macaddr8`. These types store addresses in their native form, enable subnet arithmetic and containment operators, and support GiST-based indexing for range and containment queries — things that would require complex string parsing with `text` columns.

### 🌍 When You'll Use This in the Real World

- Building IP allowlists or blocklists where you need to check whether a client IP falls within a given CIDR range.
- Storing device MAC addresses for network inventory, IoT device registries, or access control lists.
- Implementing network topology tables that track subnet assignments, IP allocations, and gateway relationships.
- Auditing tables that record `client_ip inet` for every request, then querying by subnet for incident analysis.
- Firewall rule management systems where rules contain source/destination CIDR prefixes.

### The `inet` and `cidr` Types

| Type | Stores | Example | Notes |
|------|--------|---------|-------|
| `inet` | A host address with optional subnet mask | `192.168.1.5/24` | The host bits beyond the mask are preserved |
| `cidr` | A network address | `192.168.1.0/24` | Host bits beyond mask must be zero |

```sql
-- inet: stores host address with optional prefix length
SELECT '192.168.1.5'::inet;          -- 192.168.1.5
SELECT '192.168.1.5/24'::inet;       -- 192.168.1.5/24
SELECT '::1'::inet;                   -- IPv6 loopback
SELECT '2001:db8::1/64'::inet;       -- IPv6 with prefix

-- cidr: network address; host bits must be zero
SELECT '192.168.1.0/24'::cidr;       -- 192.168.1.0/24
SELECT '192.168.1.5/24'::cidr;       -- ERROR: invalid cidr value
-- PostgreSQL will silently zero the host bits on some versions; safer to be explicit

-- Convert inet to cidr (zero out host bits)
SELECT network('192.168.1.5/24'::inet)::cidr;   -- 192.168.1.0/24
```

### Network Functions and Operators

```sql
-- Containment operators (the most important ones)
SELECT '192.168.1.5'::inet << '192.168.1.0/24'::cidr;    -- true: host is IN subnet
SELECT '10.0.0.1'::inet << '192.168.1.0/24'::cidr;       -- false
SELECT '192.168.1.0/24'::cidr <<= '192.168.0.0/16'::cidr; -- true: subnet is within supernet
SELECT '192.168.0.0/16'::cidr >>= '192.168.1.0/24'::cidr; -- true: supernet contains subnet

-- Overlap
SELECT '192.168.1.0/24'::cidr && '192.168.1.128/25'::cidr; -- true

-- Address functions
SELECT host('192.168.1.5/24'::inet);         -- '192.168.1.5' (strip mask)
SELECT masklen('192.168.1.5/24'::inet);      -- 24
SELECT netmask('192.168.1.5/24'::inet);      -- '255.255.255.0'
SELECT network('192.168.1.5/24'::inet);      -- '192.168.1.0/24'
SELECT broadcast('192.168.1.0/24'::inet);    -- '192.168.1.255/24'
SELECT abbrev('192.168.1.0/24'::cidr);       -- '192.168.1/24'
SELECT family('192.168.1.1'::inet);          -- 4 (IPv4); 6 for IPv6

-- Arithmetic
SELECT '192.168.1.5'::inet + 3;      -- 192.168.1.8
SELECT '192.168.1.10'::inet - 2;     -- 192.168.1.8
SELECT '192.168.1.10'::inet - '192.168.1.1'::inet;  -- 9 (difference)
```

### Real-World: IP Allowlist Check

```sql
CREATE TABLE ip_allowlist (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    label       text NOT NULL,
    network     cidr NOT NULL,
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_ip_allowlist_network ON ip_allowlist USING gist (network inet_ops);

-- Check whether a client IP is in any allowed network
SELECT EXISTS (
    SELECT 1 FROM ip_allowlist
    WHERE network >> '203.0.113.42'::inet   -- network contains host
) AS is_allowed;

-- Which networks match a given IP?
SELECT label, network
FROM ip_allowlist
WHERE network >>= '10.0.1.0/24'::cidr  -- find supernets
   OR network <<= '10.0.1.0/24'::cidr; -- find subnets
```

### Indexing Network Types with GiST

A standard B-tree index on `inet`/`cidr` supports equality and ordering but NOT containment operators (`<<`, `>>`). For containment queries, use a GiST index with the `inet_ops` operator class:

```sql
-- GiST index for containment queries
CREATE INDEX idx_allowlist_gist ON ip_allowlist USING gist (network inet_ops);

-- B-tree index still useful for equality lookups
CREATE INDEX idx_audit_client_ip ON audit_log (client_ip);
```

### The `macaddr` and `macaddr8` Types

`macaddr` stores a 6-byte (EUI-48) MAC address. `macaddr8` stores an 8-byte (EUI-64) MAC address (used by modern network interfaces and IPv6).

```sql
-- Various accepted input formats for macaddr
SELECT '08:00:2b:01:02:03'::macaddr;
SELECT '08-00-2b-01-02-03'::macaddr;
SELECT '08002b010203'::macaddr;
SELECT '08002b:010203'::macaddr;

-- macaddr8 (EUI-64)
SELECT '08:00:2b:ff:fe:01:02:03'::macaddr8;

-- Convert macaddr to macaddr8 (inserts ff:fe in the middle)
SELECT macaddr8(('08:00:2b:01:02:03'::macaddr));

-- Truncate to manufacturer prefix (OUI — first 3 bytes)
SELECT trunc('08:00:2b:01:02:03'::macaddr);   -- 08:00:2b:00:00:00
```

### Real-World: Device Registry

```sql
CREATE TABLE devices (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mac_address macaddr NOT NULL UNIQUE,
    hostname    text,
    last_seen   timestamptz,
    client_ip   inet
);

CREATE INDEX idx_devices_mac ON devices (mac_address);
CREATE INDEX idx_devices_ip  ON devices (client_ip);

-- Find all devices from the same manufacturer (same OUI prefix)
SELECT * FROM devices
WHERE trunc(mac_address) = trunc('08:00:2b:01:02:03'::macaddr);

-- Devices in a specific subnet
SELECT * FROM devices
WHERE client_ip << '10.10.0.0/16'::cidr;
```

### Operator Summary

| Operator | Meaning | Types |
|----------|---------|-------|
| `<<` | Address is contained in network | `inet << cidr` |
| `>>` | Network contains address | `cidr >> inet` |
| `<<=` | Address/network is contained in or equals | `cidr <<= cidr` |
| `>>=` | Network contains or equals | `cidr >>= cidr` |
| `&&` | Networks overlap | `cidr && cidr` |
| `~` | Bitwise NOT | `inet` |
| `&` | Bitwise AND | `inet & inet` |
| `\|` | Bitwise OR | `inet \| inet` |

### Best Practices

- Use `inet` for client IP addresses in audit and session tables (preserves the exact host address).
- Use `cidr` for firewall rules, allowlists, and subnet definitions (enforces that host bits are zero).
- Always create a GiST index (`inet_ops`) on network columns used in containment queries.
- Prefer `macaddr` over storing MAC addresses as `text` — you get automatic format normalization, equality comparisons, and manufacturer prefix truncation for free.
- When storing both IPv4 and IPv6 addresses, use `inet` — it handles both families transparently.

---

## 14. JSON Types

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

## 15. Arrays

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

## 16. Range Types

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

## 17. Generated Columns

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

## 18. Composite & Enum Types

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

## 19. Full-Text Search

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

## 20. Indexes — Theory & Practice

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

### Heaps & CTIDs

Every table in PostgreSQL is a **heap** — rows are stored in 8KB pages, appended in insert order with no inherent sorting. Every row has a `ctid` (current tuple ID) — a physical address in the format `(page, slot)`.

```sql
-- ctid is a hidden system column on every table
SELECT ctid, id, email FROM users LIMIT 5;
-- (0,1)  1  alice@example.com
-- (0,2)  2  bob@example.com
-- (1,1)  3  carol@example.com  -- on page 1

-- After UPDATE or DELETE + VACUUM, ctids change — never use ctid as a stable reference
SELECT ctid FROM orders WHERE id = 42;
```

Why it matters for indexes:
- Every index entry stores a `ctid` pointer back to the heap row.
- An **index scan** finds matching ctids, then fetches each heap row (may cause random I/O).
- An **index-only scan** (with `INCLUDE` covering columns) avoids heap fetches entirely.
- **Heap bloat** from updates/deletes leaves dead tuples — VACUUM reclaims them and updates the visibility map.

```sql
-- Check heap bloat
SELECT relname, n_dead_tup, n_live_tup,
       round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 1) AS dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

### Primary Keys vs. Secondary Indexes

| | Primary Key | Secondary Index |
|---|---|---|
| Uniqueness | Required | Optional |
| NULLs allowed | Never | Yes (unless UNIQUE) |
| Count per table | One | Unlimited |
| Created automatically | Yes (via PK constraint) | Explicit `CREATE INDEX` |
| Used in FK references | Yes | No (must be unique or PK) |
| Affects row ordering | No (heap is unordered) | No |
| Index-only scan possible | Yes (with INCLUDE) | Yes (with INCLUDE) |

```sql
-- Primary key — implicit unique B-tree index
CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Secondary index — must be explicit
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
```

### Primary Key Type Comparison

Choosing the right PK type has significant performance and operational consequences:

| Type | Size | Sequential | Globally Unique | Sortable | Recommendation |
|---|---|---|---|---|---|
| `BIGINT IDENTITY` | 8 bytes | ✅ Yes | ❌ No | ✅ Yes | Default choice for internal tables |
| `UUID v4` | 16 bytes | ❌ Random | ✅ Yes | ❌ Random | Distributed systems, public IDs |
| `UUID v7` | 16 bytes | ✅ Time-ordered | ✅ Yes | ✅ Yes | Best of both — prefer over v4 |
| `ULID` | 16 bytes | ✅ Time-ordered | ✅ Yes | ✅ Yes | Same as UUID v7, text-sortable |

```sql
-- BIGINT IDENTITY (fastest, smallest, no cross-system uniqueness)
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY

-- UUID v4 (random — causes index fragmentation on large tables)
id UUID DEFAULT gen_random_uuid() PRIMARY KEY

-- UUID v7 (time-ordered — good B-tree locality, PG 17+ has gen_uuid_v7())
-- In PG 16 and earlier, use the uuid-ossp extension or a custom function
id UUID DEFAULT gen_random_uuid() PRIMARY KEY  -- replace with v7 when available
```

> **Key insight**: Random UUIDs (v4) fragment B-tree indexes because new entries insert at random positions rather than appending to the right side. On write-heavy tables this causes frequent page splits. Use sequential IDs or time-ordered UUIDs (v7) to maintain B-tree fill efficiency.

### Index Selectivity

**Selectivity** = how well an index narrows down the result set. The planner estimates it using column statistics.

```sql
-- Check column statistics (n_distinct < 0 means fraction of rows, > 0 means count)
SELECT attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'orders' AND attname IN ('status', 'user_id', 'created_at');
```

| Column | n_distinct | Selectivity | Index worthwhile? |
|---|---|---|---|
| `status` (5 values) | 5 | Low (20% per value) | Only with partial index |
| `user_id` | -0.95 | High (one user per many rows) | ✅ Yes |
| `created_at` | Very high | Very high | ✅ Yes |
| `is_active` (boolean) | 2 | Very low (50%) | ❌ No (unless partial) |

The planner uses statistics to decide whether to use an index or do a sequential scan. When the estimated fraction of rows is large (e.g. >10–20% for simple queries), a sequential scan is often faster due to better I/O locality.

```sql
-- Force statistics refresh
ANALYZE orders;

-- Check how the planner estimates a query
EXPLAIN SELECT * FROM orders WHERE status = 'pending';
-- If rows= is grossly wrong, run ANALYZE or increase statistics target:
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 500;
ANALYZE orders;
```

### Composite Range Queries

Composite indexes support range queries on the **last** column after equality filters on leading columns:

```sql
-- Index on (tenant_id, created_at)
CREATE INDEX idx_orders_tenant_date ON orders(tenant_id, created_at);

-- ✅ Uses index: equality on tenant_id, range on created_at
SELECT * FROM orders
WHERE tenant_id = 42
  AND created_at >= '2024-01-01'
  AND created_at < '2024-02-01';

-- ❌ Cannot use both range conditions efficiently:
-- Postgres can only range-scan one column at the B-tree leaf level
SELECT * FROM orders
WHERE created_at >= '2024-01-01'    -- range on first col
  AND user_id > 1000;               -- range on second col — index helps less here
```

> **Rule**: In a composite index `(A, B, C)`, you can have an equality filter on A and B, then a range on C. Two adjacent range filters mean the second range filter must be re-checked after scanning the first range.

```sql
-- Multi-dimensional ranges: use GiST with range types
CREATE INDEX idx_bookings_range ON bookings USING GIST (during);

-- Now this efficiently checks overlap:
SELECT * FROM bookings WHERE during && '[2024-06-01, 2024-06-07)';
```

### Combining Multiple Indexes (Bitmap Scans)

When a query filters on two columns that each have separate indexes, PostgreSQL may use **bitmap index scans** to combine them:

```sql
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user   ON orders(user_id);

-- PostgreSQL may combine both indexes with a BitmapAnd:
SELECT * FROM orders WHERE status = 'pending' AND user_id = 42;
```

```
Bitmap Heap Scan on orders
  Recheck Cond: ((status = 'pending') AND (user_id = 42))
  ->  BitmapAnd
        ->  Bitmap Index Scan on idx_orders_status
        ->  Bitmap Index Scan on idx_orders_user
```

How it works:
1. Each index scan produces a **bitmap** (one bit per heap page).
2. The bitmaps are ANDed (or ORed for `OR` queries) in memory.
3. Heap pages matching the final bitmap are fetched, with row-level recheck.

```sql
-- OR conditions: BitmapOr
SELECT * FROM orders WHERE status = 'pending' OR status = 'processing';
-- Better written as:
SELECT * FROM orders WHERE status = ANY(ARRAY['pending', 'processing']);
```

> 💡 **When to create a composite index vs. rely on bitmap scans**: If the same column combination is queried together frequently, a composite index is faster (single scan, no bitmap merge). Use separate indexes when columns are also queried independently.

### Duplicate Index Detection

Redundant indexes slow down writes and waste disk. The system table `pg_index` lets you find them:

```sql
-- Find exact duplicate indexes (same table + columns)
SELECT
  t.relname AS table_name,
  array_agg(i.relname ORDER BY i.relname) AS duplicate_indexes,
  ix.indkey AS columns
FROM pg_index ix
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE NOT ix.indisprimary
GROUP BY t.relname, ix.indkey
HAVING count(*) > 1
ORDER BY t.relname;

-- Find indexes made redundant by a wider composite index
-- e.g., idx_orders_user is redundant if idx_orders_user_date exists (user_id, created_at)
SELECT
  i1.relname AS redundant_index,
  i2.relname AS covering_index,
  t.relname  AS table_name
FROM pg_index ix1
JOIN pg_index ix2 ON ix1.indrelid = ix2.indrelid
                 AND ix1.indexrelid <> ix2.indexrelid
                 AND (ix1.indkey::text LIKE ix2.indkey::text || '%'
                      OR ix2.indkey::text LIKE ix1.indkey::text || '%')
JOIN pg_class t  ON t.oid  = ix1.indrelid
JOIN pg_class i1 ON i1.oid = ix1.indexrelid
JOIN pg_class i2 ON i2.oid = ix2.indexrelid
WHERE NOT ix1.indisprimary AND NOT ix2.indisprimary;
```

```sql
-- Safe removal: use CONCURRENTLY so live traffic is unaffected
DROP INDEX CONCURRENTLY idx_redundant_index;
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

## 21. EXPLAIN & Query Analysis

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

## 22. Joins

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

## 23. Subqueries

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

## 24. Lateral Joins

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

## 25. SET Operations & Combining Queries

`UNION`, `INTERSECT`, and `EXCEPT` combine the result sets of two or more `SELECT` statements. They are useful for merging data from structurally similar tables, computing differences between result sets, and implementing certain logic patterns that are awkward to express as joins.

### 🌍 When You'll Use This in the Real World

- Merging data from partitioned tables that share the same schema (before you migrate to declarative partitioning).
- Finding customers who placed orders in January AND February (INTERSECT) or only in January but not February (EXCEPT).
- Building a consolidated feed of events from multiple event-type tables with identical columns.
- Eliminating duplicate rows across two data sources during an ETL migration.
- Detecting rows that exist in one environment but not another during a data validation step.

### `UNION` vs `UNION ALL`

`UNION` deduplicates rows across the combined result (using a sort or hash); `UNION ALL` simply concatenates and is significantly faster:

```sql
-- UNION: removes duplicate rows (expensive — requires sort or hash)
SELECT user_id FROM newsletter_subscribers
UNION
SELECT user_id FROM premium_subscribers;

-- UNION ALL: keeps all rows including duplicates (fast)
SELECT user_id FROM newsletter_subscribers
UNION ALL
SELECT user_id FROM premium_subscribers;

-- Performance: always prefer UNION ALL when you know rows are distinct
-- or when duplicates are acceptable
```

**Cost difference:** `UNION` must process all rows to detect duplicates — O(n log n) for sort, O(n) for hash. `UNION ALL` is O(n). For large result sets, the difference is significant.

### `INTERSECT` and `INTERSECT ALL`

`INTERSECT` returns rows that appear in BOTH result sets (deduplicating). `INTERSECT ALL` returns each row as many times as it appears in both sets (taking the minimum count):

```sql
-- Customers who bought in both January and February
SELECT customer_id FROM orders WHERE date_trunc('month', order_date) = '2024-01-01'
INTERSECT
SELECT customer_id FROM orders WHERE date_trunc('month', order_date) = '2024-02-01';

-- Users present in both groups (with duplicates preserved per source)
SELECT user_id FROM group_a
INTERSECT ALL
SELECT user_id FROM group_b;
```

### `EXCEPT` and `EXCEPT ALL`

`EXCEPT` returns rows from the left query that do not appear in the right query. `EXCEPT ALL` uses multiset semantics:

```sql
-- Customers who bought in January but NOT in February (churned)
SELECT customer_id FROM orders WHERE date_trunc('month', order_date) = '2024-01-01'
EXCEPT
SELECT customer_id FROM orders WHERE date_trunc('month', order_date) = '2024-02-01';

-- Data validation: rows in production that are missing from staging
SELECT id, email FROM prod_users
EXCEPT
SELECT id, email FROM staging_users
ORDER BY id;
```

### Column Type Alignment Rules

All queries in a set operation must return the same number of columns, and corresponding columns must have compatible types (or be implicitly castable):

```sql
-- Types must be compatible (implicit cast applied if necessary)
SELECT id::bigint, name::text FROM customers
UNION ALL
SELECT id::bigint, company_name::text FROM vendors;

-- The result column names come from the FIRST query in the set
SELECT id, email AS contact FROM customers
UNION ALL
SELECT id, phone FROM vendors;
-- Result column names: id, contact (from first query)

-- Pad with NULLs when columns are structurally different
SELECT 'customer' AS entity_type, id, name, NULL::text AS company
FROM customers
UNION ALL
SELECT 'vendor',                   id, NULL, company_name
FROM vendors;
```

### Ordering and Limiting Combined Results

`ORDER BY` and `LIMIT` on the combined result must be placed at the end of the entire statement:

```sql
-- ORDER BY applies to the full combined result
SELECT id, name, 'customer' AS type FROM customers
UNION ALL
SELECT id, name, 'vendor'   AS type FROM vendors
ORDER BY name
LIMIT 50;

-- ORDER BY on individual branches (wrap in subquery)
SELECT * FROM (
    SELECT id, name FROM customers ORDER BY name LIMIT 100
) c
UNION ALL
SELECT * FROM (
    SELECT id, name FROM vendors ORDER BY name LIMIT 100
) v
ORDER BY name;
```

### `ROWS FROM` — Multiple Set-Returning Functions Side by Side

`ROWS FROM` (also called a parallel function call) evaluates multiple set-returning functions and zips their rows together column-by-column:

```sql
-- Zip two SRFs together (rows aligned by position)
SELECT *
FROM ROWS FROM (
    generate_series(1, 5),
    generate_series(10, 50, 10)
) AS t(a, b);
-- Result: (1,10), (2,20), (3,30), (4,40), (5,50)

-- When functions produce different row counts, shorter ones are padded with NULLs
SELECT *
FROM ROWS FROM (
    generate_series(1, 3),
    unnest(ARRAY['a','b'])
) AS t(num, letter);
-- Result: (1,'a'), (2,'b'), (3, NULL)

-- Useful for combining unnested arrays in parallel
SELECT num, letter
FROM ROWS FROM (
    unnest(ARRAY[10, 20, 30]),
    unnest(ARRAY['x', 'y', 'z'])
) AS t(num, letter);
```

### Subquery Elimination — How the Planner Rewrites Subqueries into Joins

PostgreSQL's query planner performs **subquery flattening** (also called subquery pullup or unnesting): it rewrites subqueries into joins when it determines this will produce a better plan.

```sql
-- Written as a subquery
SELECT * FROM orders
WHERE customer_id IN (SELECT id FROM customers WHERE country = 'US');

-- The planner may rewrite this as:
SELECT DISTINCT o.* FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE c.country = 'US';

-- Check with EXPLAIN to see what the planner actually does:
EXPLAIN SELECT * FROM orders
WHERE customer_id IN (SELECT id FROM customers WHERE country = 'US');
-- Look for: "Hash Semi Join" or "Merge Semi Join" — the planner converted IN → a semi-join
```

**When the planner cannot flatten:**
- Subqueries with `LIMIT`/`OFFSET` inside
- Subqueries with `DISTINCT` in some contexts
- Correlated subqueries that reference outer columns in complex ways
- Subqueries inside `OR` conditions

```sql
-- This subquery CANNOT be flattened due to LIMIT:
SELECT * FROM orders
WHERE customer_id IN (SELECT id FROM customers WHERE country = 'US' LIMIT 10);

-- Force materialization to prevent repeated evaluation of an expensive subquery
SELECT * FROM orders o
JOIN (SELECT id FROM customers WHERE country = 'US') c ON c.id = o.customer_id;
-- The subquery may be materialized once by the planner

-- Use LATERAL for correlated subqueries that the planner handles well
SELECT o.*, recent.last_order_date
FROM customers c
CROSS JOIN LATERAL (
    SELECT max(order_date) AS last_order_date
    FROM orders WHERE customer_id = c.id
) recent;
```

### Operator Precedence

`INTERSECT` binds more tightly than `UNION` and `EXCEPT`. Use parentheses to make intent explicit:

```sql
-- Ambiguous: INTERSECT binds first
SELECT a FROM t1
UNION
SELECT b FROM t2
INTERSECT
SELECT c FROM t3;
-- Evaluated as: t1 UNION (t2 INTERSECT t3)

-- Explicit with parentheses
(SELECT a FROM t1 UNION SELECT b FROM t2)
INTERSECT
SELECT c FROM t3;
```

### Best Practices

- Default to `UNION ALL` over `UNION`. If you need deduplication, use `UNION` deliberately and be aware of the cost.
- Put `ORDER BY` and `LIMIT` after the entire combined query, not on individual branches (unless wrapping in subqueries).
- Use `EXCEPT` for data validation and data diff queries — it is more readable than a `NOT EXISTS` join for this purpose.
- Use parentheses when mixing `UNION`, `INTERSECT`, and `EXCEPT` to avoid relying on implicit precedence.
- For large combined result sets, profile with `EXPLAIN ANALYZE` — set operations can be expensive and may be better expressed as joins with `DISTINCT` in some cases.

---

## 26. Window Functions

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

## 27. Grouping Sets, ROLLUP & CUBE

Standard `GROUP BY` produces one row per unique combination of the grouping columns. `GROUPING SETS`, `ROLLUP`, and `CUBE` are extensions that compute multiple grouping combinations in a single pass over the data — the equivalent of multiple `GROUP BY` queries combined with `UNION ALL`, but far more efficient and expressive.

### 🌍 When You'll Use This in the Real World

- Generating a sales report that shows totals by region, then by product category, then a grand total — all in one query.
- Building a pivot-like dashboard where you need row subtotals, column subtotals, and a grand total simultaneously.
- Feeding data warehouse fact tables where the ETL process needs pre-aggregated subtotals at multiple granularities.
- Replacing a series of `UNION ALL` queries that each perform a full table scan with a single more efficient pass.

### `GROUPING SETS`

`GROUPING SETS` explicitly lists which grouping combinations to compute. Each set produces its own group of rows in the result:

```sql
SELECT region, product, SUM(sales) AS total_sales
FROM sales_fact
GROUP BY GROUPING SETS (
    (region, product),   -- subtotal per region+product
    (region),            -- subtotal per region
    (product),           -- subtotal per product
    ()                   -- grand total
);

-- This is exactly equivalent to (but much faster than):
SELECT region, product, SUM(sales) FROM sales_fact GROUP BY region, product
UNION ALL
SELECT region, NULL,    SUM(sales) FROM sales_fact GROUP BY region
UNION ALL
SELECT NULL,   product, SUM(sales) FROM sales_fact GROUP BY product
UNION ALL
SELECT NULL,   NULL,    SUM(sales) FROM sales_fact;
```

In the result, columns that are not part of a particular grouping set appear as `NULL`. Use the `GROUPING()` function to distinguish these grouping NULLs from actual NULL data values.

### `ROLLUP` — Hierarchical Subtotals

`ROLLUP(a, b, c)` generates grouping sets for all prefixes of the column list plus the grand total:

```sql
-- ROLLUP(region, category, product) produces:
-- (region, category, product), (region, category), (region), ()
SELECT region, category, product, SUM(sales) AS total_sales
FROM sales_fact
GROUP BY ROLLUP(region, category, product)
ORDER BY region NULLS LAST, category NULLS LAST, product NULLS LAST;
```

This is ideal for hierarchical data like `year → quarter → month`, `country → state → city`, or `department → team → employee`.

```sql
-- Time hierarchy rollup
SELECT
    date_trunc('year',  sale_date) AS year,
    date_trunc('month', sale_date) AS month,
    date_trunc('day',   sale_date) AS day,
    SUM(amount) AS total
FROM sales
GROUP BY ROLLUP(
    date_trunc('year',  sale_date),
    date_trunc('month', sale_date),
    date_trunc('day',   sale_date)
)
ORDER BY 1 NULLS LAST, 2 NULLS LAST, 3 NULLS LAST;
```

### `CUBE` — All Combinations

`CUBE(a, b, c)` generates grouping sets for every possible subset (the power set) of the column list:

```sql
-- CUBE(region, category) produces:
-- (region, category), (region), (category), ()
SELECT region, category, SUM(sales)
FROM sales_fact
GROUP BY CUBE(region, category);

-- CUBE(a, b, c) produces 2^3 = 8 combinations:
-- (a,b,c), (a,b), (a,c), (b,c), (a), (b), (c), ()
```

`CUBE` is expensive for many columns — 2^n grouping sets. Use it only when you genuinely need every cross-tabulation.

### The `GROUPING()` Function

When grouping NULLs (produced by `ROLLUP`/`CUBE`/`GROUPING SETS`) appear alongside real NULL data, you need `GROUPING()` to tell them apart:

```sql
SELECT
    CASE WHEN GROUPING(region)   = 1 THEN 'ALL REGIONS'   ELSE region   END AS region,
    CASE WHEN GROUPING(category) = 1 THEN 'ALL CATEGORIES' ELSE category END AS category,
    SUM(sales) AS total_sales,
    GROUPING(region) AS is_region_total,
    GROUPING(category) AS is_category_total
FROM sales_fact
GROUP BY ROLLUP(region, category)
ORDER BY GROUPING(region), GROUPING(category), region, category;

-- GROUPING() returns 1 if the column is aggregated (part of a subtotal row)
--             returns 0 if the column is a real grouping value
```

### Practical Reporting Example

```sql
-- Sales dashboard: totals by channel and quarter, with subtotals
SELECT
    CASE WHEN GROUPING(channel) = 1      THEN 'Grand Total'
         WHEN GROUPING(quarter) = 1      THEN channel || ' Total'
         ELSE channel END AS channel_label,
    CASE WHEN GROUPING(quarter) = 1 THEN NULL ELSE quarter END AS qtr,
    SUM(revenue) AS revenue,
    SUM(units)   AS units,
    ROUND(SUM(revenue) / NULLIF(SUM(units), 0), 2) AS avg_price
FROM (
    SELECT
        channel,
        'Q' || EXTRACT(quarter FROM sale_date)::text AS quarter,
        revenue,
        units
    FROM sales
    WHERE EXTRACT(year FROM sale_date) = 2024
) sub
GROUP BY GROUPING SETS (
    (channel, quarter),  -- detail rows
    (channel),           -- channel subtotals
    ()                   -- grand total
)
ORDER BY
    GROUPING(channel),
    channel NULLS LAST,
    GROUPING(quarter),
    qtr NULLS LAST;
```

### Performance Considerations

```sql
-- EXPLAIN shows a single Aggregate node with multiple grouping levels
EXPLAIN ANALYZE
SELECT region, SUM(sales)
FROM sales_fact
GROUP BY ROLLUP(region);

-- With a large table, ROLLUP is significantly faster than UNION ALL
-- because the data is scanned once and the planner sorts/hashes for all levels.

-- Partial ROLLUP and CUBE can be combined with regular GROUP BY:
SELECT year, ROLLUP(region, category), SUM(sales)
FROM sales_fact
GROUP BY year, ROLLUP(region, category);
-- year is a fixed grouping; ROLLUP only applies to region, category
```

### Comparison Table

| Feature | Syntax | Grouping Sets Produced | Best For |
|---------|--------|----------------------|----------|
| `GROUPING SETS` | `GROUPING SETS ((a,b),(a),())` | Exactly those listed | Full control over output |
| `ROLLUP` | `ROLLUP(a, b, c)` | All prefixes + grand total | Hierarchical dimensions |
| `CUBE` | `CUBE(a, b, c)` | All subsets (power set) | Cross-tabulation / pivots |

### Best Practices

- Use `ROLLUP` for date/time hierarchies and organizational hierarchies. It is the most common use case.
- Use `GROUPING()` in CASE expressions to replace grouping NULLs with readable labels like "All Regions."
- Avoid `CUBE` with more than 4 columns — the number of grouping sets grows as 2^n.
- Sort output by `GROUPING()` expressions to bring subtotals and grand totals to intuitive positions.
- Ensure the base table has an appropriate index to support the initial scan; ROLLUP/CUBE do not add scan costs beyond what `GROUP BY` already requires.

---

## 28. CTEs (Common Table Expressions)

### 🌍 When You'll Use This in the Real World

- **Complex analytics pipelines**: Stage data in named blocks (`filtered_orders`, `daily_revenue`, `rolling_avg`) so each transformation is explicit.
- **Hierarchy traversal**: Expand trees and graphs for org charts, category trees, referral chains, dependency graphs.
- **Safe multi-step writes**: Move/archive/update data in one SQL statement with clear data flow and transactional consistency.
- **Incremental ETL in SQL**: Deduplicate raw records, compute canonical keys, and load targets with one auditable statement.

A CTE is a **named temporary result set** defined with `WITH` (or `WITH RECURSIVE`) and scoped to a single SQL statement.

```sql
WITH active_users AS (
  SELECT id, name
  FROM users
  WHERE active = TRUE
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

### Mental Model

Think of CTEs as "inline, named views" for one statement:

1. You define one or more named query blocks.
2. Later blocks can reference earlier blocks.
3. The final query consumes one or more of those blocks.

```sql
WITH a AS (...),
     b AS (SELECT ... FROM a),
     c AS (SELECT ... FROM b)
SELECT ... FROM c;
```

The result is usually easier to read than deeply nested subqueries, especially when each step has a meaningful name.

### CTE vs Subquery vs Temp Table

| Tool | Best For | Lifetime | Planner Flexibility |
|---|---|---|---|
| CTE | Readability, multi-step logic, recursion | Single statement | High (PG12+ may inline) |
| Subquery | Small local transformations | Single statement | High |
| Temp table | Reuse across multiple statements, debugging large intermediate results | Session/transaction | Separate planning per statement |

Use a **CTE** when the logical steps matter for maintainability; use a **temp table** when intermediate data must be reused in multiple statements.

### Execution & Optimization Semantics

In PostgreSQL 12+, non-recursive CTEs are no longer always optimization fences.

- The planner can inline a CTE into the outer query.
- You can force behavior with `MATERIALIZED` / `NOT MATERIALIZED`.

```sql
-- Evaluate once and store intermediate result
WITH user_stats AS MATERIALIZED (
  SELECT user_id, COUNT(*) AS cnt
  FROM orders
  GROUP BY user_id
)
SELECT *
FROM user_stats
WHERE cnt > 10;

-- Encourage inlining into outer query
WITH user_stats AS NOT MATERIALIZED (
  SELECT user_id, COUNT(*) AS cnt
  FROM orders
  GROUP BY user_id
)
SELECT *
FROM user_stats
WHERE cnt > 10;
```

When `MATERIALIZED` helps:
- The CTE is expensive and referenced multiple times.
- You want a stable intermediate result for the statement.

When `NOT MATERIALIZED` helps:
- You want predicate pushdown from the outer query.
- The CTE is cheap and benefits from global optimization.

### Multi-Use CTE Example (Avoid Repeating Work)

```sql
WITH heavy AS MATERIALIZED (
  SELECT user_id, SUM(amount) AS total_amount
  FROM payments
  WHERE paid_at >= NOW() - INTERVAL '90 days'
  GROUP BY user_id
)
SELECT u.id,
       h.total_amount,
       CASE WHEN h.total_amount > 10000 THEN 'vip' ELSE 'regular' END AS segment
FROM users u
JOIN heavy h ON h.user_id = u.id
WHERE h.total_amount > 500;
```

### Recursive CTEs

Recursive CTEs solve hierarchical and graph traversal problems.

Structure:
1. **Anchor query** (base rows)
2. `UNION ALL`
3. **Recursive query** (references the CTE itself)
4. Iterates until no new rows are produced

```sql
WITH RECURSIVE org_tree AS (
  -- Anchor: roots
  SELECT id, name, manager_id, 0 AS depth, ARRAY[id] AS path_ids
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursive member: children
  SELECT e.id,
         e.name,
         e.manager_id,
         t.depth + 1,
         t.path_ids || e.id
  FROM employees e
  JOIN org_tree t ON e.manager_id = t.id
  WHERE t.depth < 20
    AND NOT (e.id = ANY(t.path_ids))  -- cycle guard
)
SELECT id, name, manager_id, depth, path_ids
FROM org_tree
ORDER BY path_ids;
```

### Cycle Detection and Safety

Recursive mistakes can cause runaway queries. Protect yourself with:

- A max depth guard (`WHERE depth < N`)
- Cycle detection (`NOT id = ANY(path_ids)`)
- Sensible `statement_timeout`

```sql
SET statement_timeout = '10s';
```

### Practical Recursive Patterns

```sql
-- Category descendants from a given node
WITH RECURSIVE cat_tree AS (
  SELECT id, parent_id, name, 0 AS depth
  FROM categories
  WHERE id = 42

  UNION ALL

  SELECT c.id, c.parent_id, c.name, t.depth + 1
  FROM categories c
  JOIN cat_tree t ON c.parent_id = t.id
)
SELECT * FROM cat_tree ORDER BY depth, id;
```

```sql
-- Bill of materials explosion
WITH RECURSIVE bom AS (
  SELECT parent_part_id, child_part_id, qty, qty::numeric AS cumulative_qty
  FROM part_components
  WHERE parent_part_id = 100

  UNION ALL

  SELECT pc.parent_part_id,
         pc.child_part_id,
         pc.qty,
         b.cumulative_qty * pc.qty
  FROM part_components pc
  JOIN bom b ON pc.parent_part_id = b.child_part_id
)
SELECT child_part_id, SUM(cumulative_qty) AS total_required
FROM bom
GROUP BY child_part_id
ORDER BY child_part_id;
```

### Writable CTEs

Writable CTEs allow multi-step data modifications in one statement.

```sql
-- Move cancelled orders to archive atomically
WITH moved AS (
  DELETE FROM orders
  WHERE status = 'cancelled'
    AND created_at < NOW() - INTERVAL '1 year'
  RETURNING *
)
INSERT INTO orders_archive
SELECT * FROM moved;
```

```sql
-- Update and audit in one statement
WITH updated AS (
  UPDATE subscriptions
  SET status = 'expired'
  WHERE expires_at < NOW()
    AND status <> 'expired'
  RETURNING id, user_id, status, expires_at
)
INSERT INTO subscription_audit (subscription_id, user_id, event_type, event_at)
SELECT id, user_id, 'auto_expire', NOW()
FROM updated;
```

### CTEs with RETURNING for API Workflows

```sql
WITH created AS (
  INSERT INTO projects (name, owner_id)
  VALUES ('QueryViz', 7)
  RETURNING id, name, owner_id, created_at
)
SELECT c.*, u.email AS owner_email
FROM created c
JOIN users u ON u.id = c.owner_id;
```

This is great for application endpoints that need to write and immediately return a rich response payload.

### Debugging and Tuning CTE Queries

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
WITH candidate_users AS (
  SELECT id
  FROM users
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT COUNT(*)
FROM candidate_users cu
JOIN events e ON e.user_id = cu.id;
```

What to check:
- Are filters pushed down into base table scans?
- Is the CTE scanned repeatedly in an inefficient way?
- Would `MATERIALIZED` or `NOT MATERIALIZED` improve the plan?
- Are indexes available for join/filter columns used inside CTE blocks?

### Common Pitfalls

- Treating CTEs as always materialized (not true since PG12).
- Overusing CTE layers for trivial queries (can reduce clarity).
- Missing cycle protection in recursive queries.
- Using `UNION` instead of `UNION ALL` in recursion without realizing dedup cost.
- Assuming row order inside a CTE is preserved without an outer `ORDER BY`.

### Best Practices

- Name CTEs by intent (`recent_orders`, `deduped_events`, `eligible_users`).
- Keep each CTE focused on one transformation step.
- Use recursion only when modeling true hierarchy/graph traversal.
- Add explicit safety guards (`depth`, cycle checks, timeout) for recursive queries.
- Profile with `EXPLAIN ANALYZE` before and after `MATERIALIZED` changes.
- Favor correctness/readability first, then optimize with plan evidence.

---

## 29. Transactions & Concurrency Control

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

## 30. Table Partitioning

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

## 31. Views & Materialized Views

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

## 32. Stored Procedures & Functions

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

## 33. Triggers & Event-Driven Logic

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

## 34. Roles, Privileges & Row-Level Security

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

## 35. Performance Tuning & Configuration

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

## 36. Vacuum, Autovacuum & Bloat Management

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

## 37. Backup, Recovery & Replication

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

## 38. Extensions

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

## 39. pgvector & Semantic Search

**pgvector** is a PostgreSQL extension that adds a `vector` data type and distance-based search operators, enabling semantic similarity search directly in the database. Instead of a separate vector database, you can store embeddings alongside your relational data and combine semantic search with SQL filtering, joins, and transactions.

### 🌍 When You'll Use This in the Real World

- **RAG (Retrieval-Augmented Generation)**: Store document chunk embeddings in PostgreSQL; at query time, find the most relevant chunks using cosine similarity, then pass them to an LLM as context.
- **Recommendation engines**: Store user and item embeddings; find the N most similar items to what a user recently interacted with.
- **Duplicate/near-duplicate detection**: Detect duplicate support tickets, product listings, or user profiles using embedding similarity.
- **Semantic search**: A user searches "comfortable running shoes" and matches product descriptions that say "cushioned athletic footwear" — keyword search misses it, vector search finds it.
- **Image and audio search**: Store embeddings of images or audio files; search by visual or sonic similarity.

### Installing pgvector

```sql
-- On most platforms, install via the system package manager first
-- Ubuntu/Debian: apt install postgresql-16-pgvector
-- macOS (Homebrew): brew install pgvector
-- AWS RDS / Supabase: available as a managed extension

-- Then enable in your database:
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### The `vector` Type

`vector(n)` stores a fixed-dimension array of 32-bit floats. The dimension `n` must match the embedding model output:

| Model | Dimensions |
|-------|-----------|
| OpenAI text-embedding-3-small | 1536 (or configured lower) |
| OpenAI text-embedding-3-large | 3072 |
| OpenAI text-embedding-ada-002 | 1536 |
| Cohere embed-english-v3.0 | 1024 |
| Google text-embedding-004 | 768 |
| Nomic embed-text | 768 |
| BGE-M3 | 1024 |

```sql
-- Create a table with a vector column
CREATE TABLE documents (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content     text NOT NULL,
    source_url  text,
    embedding   vector(1536),       -- must match your embedding model's output dimension
    created_at  timestamptz DEFAULT now()
);

-- Insert a row with a literal vector (for testing)
INSERT INTO documents (content, embedding)
VALUES ('Hello world', '[0.1, 0.2, 0.3, ...]');   -- 1536 values

-- In practice, embeddings come from your application:
-- embedding = openai.embeddings.create(input=content, model="text-embedding-3-small").data[0].embedding
```

### Distance Operators

pgvector provides three distance operators, each corresponding to a different similarity metric:

| Operator | Distance Metric | Use When |
|----------|----------------|----------|
| `<->` | L2 (Euclidean) distance | Normalized embeddings or when magnitude matters |
| `<#>` | Negative inner product | Normalized embeddings (higher = more similar; negate to get distance) |
| `<=>` | Cosine distance | Most language models (direction matters, magnitude does not) |

```sql
-- Find the 10 most similar documents to a query embedding (cosine similarity)
SELECT id, content, (embedding <=> '[0.1, 0.2, ...]'::vector) AS distance
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- L2 distance (Euclidean)
SELECT id, content, embedding <-> '[0.1, 0.2, ...]'::vector AS l2_distance
FROM documents
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- Inner product (note: <#> returns negative inner product; use - to get positive similarity)
SELECT id, content, -(embedding <#> '[0.1, 0.2, ...]'::vector) AS similarity
FROM documents
ORDER BY embedding <#> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

### Creating Vector Indexes

Without an index, every similarity query does a sequential scan — computing the distance to every row. For tables with more than ~10,000 rows, you need an ANN (approximate nearest-neighbor) index.

pgvector supports two index types:

#### IVFFlat — Inverted File with Flat Quantization

Splits the vector space into `lists` clusters (Voronoi cells) using k-means. At query time, it searches only the closest `probes` clusters.

```sql
-- Build index after loading data (IVFFlat needs data to train the k-means clusters)
-- Rule of thumb: lists = rows / 1000 (for up to 1M rows)
CREATE INDEX idx_documents_embedding_ivfflat
ON documents
USING ivfflat (embedding vector_cosine_ops)    -- or vector_l2_ops / vector_ip_ops
WITH (lists = 100);

-- Tune probes at query time (higher = more accurate, slower)
SET ivfflat.probes = 10;   -- default 1; try 5–20 for better recall
```

#### HNSW — Hierarchical Navigable Small World

Builds a layered graph structure. Faster queries than IVFFlat with better recall, but uses more memory and takes longer to build.

```sql
-- HNSW can be built on an empty table (no data needed for training)
-- m: max connections per node (default 16; higher = better recall, more memory)
-- ef_construction: size of the candidate list during build (default 64; higher = better recall, slower build)
CREATE INDEX idx_documents_embedding_hnsw
ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Tune ef_search at query time
SET hnsw.ef_search = 100;   -- default 40; higher = better recall, slower
```

#### IVFFlat vs HNSW Comparison

| Factor | IVFFlat | HNSW |
|--------|---------|------|
| Build speed | Fast | Slow (graph construction) |
| Query speed | Moderate | Fast |
| Memory usage | Low | Higher (~2-3x IVFFlat) |
| Recall quality | Good | Better |
| Requires training data | Yes (build after loading) | No |
| Index updates | OK | Better (no full rebuild) |
| Best for | Batch workloads, infrequent updates | High-QPS, streaming inserts |

### Upsert Patterns for Embedding Tables

In RAG and recommendation systems, embeddings are frequently regenerated. Use `INSERT ... ON CONFLICT DO UPDATE`:

```sql
-- Upsert by natural key (source URL)
INSERT INTO documents (content, source_url, embedding)
VALUES ($1, $2, $3)
ON CONFLICT (source_url) DO UPDATE
    SET content    = EXCLUDED.content,
        embedding  = EXCLUDED.embedding,
        created_at = now()
WHERE documents.content IS DISTINCT FROM EXCLUDED.content;
-- Only update if content actually changed (avoids unnecessary index churn)

-- Batch upsert from application
INSERT INTO documents (content, source_url, embedding)
SELECT unnest($1::text[]), unnest($2::text[]), unnest($3::vector[])
ON CONFLICT (source_url) DO UPDATE
    SET content   = EXCLUDED.content,
        embedding = EXCLUDED.embedding;
```

### Combining Semantic Search with Keyword Full-Text Search

Hybrid search — combining vector similarity with BM25-style keyword matching — produces better results than either alone:

```sql
-- Add a tsvector column for keyword search
ALTER TABLE documents ADD COLUMN fts tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_documents_fts ON documents USING gin (fts);

-- Hybrid search: keyword pre-filter then re-rank by vector similarity
WITH keyword_matches AS (
    SELECT id, content, embedding,
           ts_rank(fts, query) AS text_rank
    FROM documents,
         websearch_to_tsquery('english', 'running shoes cushioned') query
    WHERE fts @@ query
    LIMIT 200   -- cast a wide net with keyword search
)
SELECT id, content,
       text_rank,
       embedding <=> '[...]'::vector AS vector_distance,
       -- Reciprocal rank fusion score (combine both signals)
       0.5 * text_rank + 0.5 * (1 - (embedding <=> '[...]'::vector)) AS hybrid_score
FROM keyword_matches
ORDER BY hybrid_score DESC
LIMIT 10;
```

### Filtering Before Vector Search

Combine vector search with SQL filters to limit the search scope:

```sql
-- Find similar documents in a specific project and date range
SELECT id, content, embedding <=> $1::vector AS distance
FROM documents
WHERE project_id = $2
  AND created_at >= now() - interval '30 days'
  AND embedding <=> $1::vector < 0.3    -- distance threshold (cosine: 0=identical, 2=opposite)
ORDER BY distance
LIMIT 20;

-- IMPORTANT: pre-filtering with WHERE reduces the candidate set before vector distance is computed
-- This is efficient when the WHERE clause is selective (uses an index on project_id/created_at)
-- The vector index is used for the ORDER BY distance clause
```

### Chunking Strategy for RAG

The embedding quality heavily depends on how you split documents into chunks:

```sql
-- Store chunk metadata alongside the embedding
CREATE TABLE document_chunks (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id   bigint NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    chunk_index   integer NOT NULL,
    content       text NOT NULL,
    token_count   integer,
    embedding     vector(1536),
    -- Store the chunk's source context for retrieval
    section_title text,
    page_number   integer,
    UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_chunks_document ON document_chunks (document_id);
CREATE INDEX idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- RAG query: find most relevant chunks, then join back to full document metadata
SELECT
    dc.content AS chunk_text,
    d.source_url,
    dc.section_title,
    dc.embedding <=> $1::vector AS distance
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
ORDER BY dc.embedding <=> $1::vector
LIMIT 5;
```

### Monitoring Index Quality

```sql
-- Check index usage
SELECT relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexrelname LIKE '%embedding%';

-- Estimate recall quality by comparing ANN results to exact search on a sample
-- (run both queries on a small subset and measure overlap)
WITH exact AS (
    SELECT id FROM document_chunks
    ORDER BY embedding <-> $1::vector LIMIT 10
),
approximate AS (
    SELECT id FROM document_chunks
    ORDER BY embedding <-> $1::vector LIMIT 10  -- same with index enabled
)
SELECT
    (SELECT count(*) FROM exact e JOIN approximate a ON a.id = e.id)::float / 10
    AS recall_at_10;
```

### Best Practices

- Choose the distance operator that matches your embedding model. Most language embedding models are trained with cosine similarity — use `<=>` (cosine distance).
- Normalize embeddings before storing them when using inner product (`<#>`) to make it equivalent to cosine similarity — this can be faster.
- Build HNSW indexes for production query workloads and IVFFlat for batch analytical workloads or when memory is constrained.
- Always tune `hnsw.ef_search` or `ivfflat.probes` upward if recall quality matters more than raw latency.
- Use a distance threshold (`embedding <=> $1 < 0.3`) to filter out poor matches rather than returning a fixed `LIMIT` regardless of similarity.
- Keep embedding dimensions as low as your accuracy requirements allow — lower dimensions mean smaller indexes, faster queries, and less memory.
- For RAG systems, store chunks, not full documents, and include enough metadata (source, section, page) to construct attribution information for LLM responses.
- Index `project_id`, `tenant_id`, and other filter columns separately so the planner can combine them with the vector index efficiently.

---

*Comprehensive PostgreSQL reference — from study notes to architect-level guide. Updated for PostgreSQL 15+.*

---

> This guide was created based on the source **Mastering Postgres** (by Aaron Francis), widely regarded as one of the best PostgreSQL courses.

## 40. Utility Patterns & Recipes

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

## 41. Quick Reference Cheatsheet

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

## 42. Anti-Patterns to Avoid

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

