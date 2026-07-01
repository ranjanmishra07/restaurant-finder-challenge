# Restaurant Finder API

API for the technical challenge — helps users find nearby restaurants based on coordinates and visibility radius.

## Architecture

```
Route → Middleware → Controller → Service → Repository → PostgreSQL
```

| Layer | Responsibility |
|---|---|
| `routes/` | Fastify route definitions and schema registration |
| `controllers/` | HTTP request/response handling |
| `services/` | Domain mapping (search results, location details) |
| `repositories/` | PostgreSQL queries — indexed search, PK lookup, upsert |
| `models/` | Domain types, DTOs, and mappers |
| `db/` | Migrations, seed script, connection pool |

Search SQL lives in the repository (B-tree-indexed bbox prune + exact radius filter). The service layer maps rows to API DTOs.

## Prerequisites

**Manual setup**

- Node.js 20+ (see `.nvmrc`)
- npm
- PostgreSQL 16+ running locally with a database you can connect to (create a user and database using whatever credentials you prefer)

**Docker setup**

- Docker and Docker Compose

## Setup

Pick one path — manual (local Postgres + Node) or full Docker (Postgres + API in one command).

### Manual setup

1. **Create and configure `.env`:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set `DATABASE_URL` to match **your** Postgres username, password, host, port, and database name:

   ```
   DATABASE_URL=postgresql://<your-user>:<your-password>@<host>:<port>/<your-database>
   ```

   Example (replace with your own values):

   ```
   DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/my_restaurant_db
   ```

   The same credentials must work when you run migrate/seed and when the API starts — all scripts read from `.env`.

2. **Create the database** (if it does not exist yet), using the user and database name you put in `.env`:

   ```bash
   psql -U postgres -c "CREATE USER \"<your-user>\" WITH PASSWORD '<your-password>';"
   psql -U postgres -c "CREATE DATABASE \"<your-database>\" OWNER \"<your-user>\";"
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Apply schema and seed data** (Postgres must be running and reachable at the URL in `.env`):

   seed data with small or large dataset , configurable in .env file and takes from data folder .
   ```bash
   npm run db:migrate
   npm run db:seed 
   ```

5. **Run the server:**

   ```bash
   npm run dev          # dev mode with hot reload → http://localhost:3000
   # or
   npm run build && npm start
   ```

### Docker setup (everything in one step)

```bash
docker compose up --build
```

Starts Postgres and the API, runs migrations and seed on startup. API available at `http://localhost:3000`. Environment variables are set in `docker-compose.yml` — no `.env` file needed for this path.

### Test the API (Postman, docs, examples)

Once the server is running at `http://localhost:3000`:

1. **Postman** — Import `postman/restaurant-finder.postman_collection.json` (Postman → **Import** → **Upload Files** or drag the file in). Run **Auth - Issue Token** first; it saves the JWT to the `{{token}}` collection variable used by the other requests. Then send **Locations - Search**, **Get Location**, and **Upsert Location** as needed. Change `baseUrl` in collection variables if your server is not on port 3000.

2. **Swagger UI** — Open [http://localhost:3000/docs](http://localhost:3000/docs) in a browser to browse and try endpoints interactively.

3. **Request/response examples** — See [api-req-res-readme.md](./api-req-res-readme.md) for curl-based request/response pairs covering success and error cases.

4. **Validation errors** — See [error-validation-readme.md](./error-validation-readme.md) for the client-safe error message catalog and validation test results.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/locations/search?x=&y=&limit=&offset=` | Search visible restaurants (`limit` default 20, `offset` default 0) |
| `GET` | `/locations/:id` | Get restaurant details |
| `PUT` | `/locations/:id` | Add or update a restaurant |
| `POST` | `/auth/token` | Issue an auth token |
| `GET` | `/docs` | OpenAPI Swagger UI |

## Database

Schema: `locations` table with integer `x`, `y`, `radius` and **B-tree indexes on `x` and `y`;

```bash
npm run db:migrate   # apply schema
npm run db:seed      # load data/locations.json
```

## Testing

There are two test suites:

| Suite | Command | What it runs |
|---|---|---|
| **Unit tests** | `npm test` | Fast tests with mocked dependencies (no real DB required) |
| **Integration tests** | `npm run test:integration` | Tests against a real PostgreSQL database (`tests/integration/`) |

```bash
npm test                    # unit tests only (default)
npm run test:watch          # unit tests in watch mode
npm run test:integration    # requires DATABASE_URL and a migrated DB
```

Integration tests need a `.env` with your `DATABASE_URL` and migrations applied (`npm run db:migrate`). CI runs unit tests first, then migrates, then integration tests.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `JWT_SECRET` | — | Secret for JWT signing |
| `DATABASE_URL` | — | Your PostgreSQL connection string in `.env` (user, password, host, port, database) — required for manual setup and integration tests |
| `DB_CONNECTION_TIMEOUT_MS` | `5000` | Fail fast if a new Postgres connection cannot be opened in time |
| `DB_QUERY_TIMEOUT_MS` | `10000` | Abort queries that run longer than this (returns 500 via error handler) |
| `DB_IDLE_TIMEOUT_MS` | `30000` | Close unused pooled connections after this idle period |
| `LOCATIONS_FILE` | `data/locations.json` | Seed data file |
| `RATE_LIMIT_MAX` | `100` | Max requests per window for `PUT /locations/:id` |
| `RATE_LIMIT_TIME_WINDOW` | `1 minute` | Rate limit window for `PUT /locations/:id` |
| `LOG_LEVEL` | `info` | Logger level (`fatal`,`error`,`warn`,`info`,`debug`,`trace`) |

## Technical Rationale

**PostgreSQL with B-tree indexes on `x` and `y`** — The search first narrows things down to a small box around the user using these two indexes, instead of scanning every row. Postgres combines both indexes to find candidates quickly (~O(log N + k)) rather than checking the whole table (O(N)). We started with a GiST/spatial index, but since the query filters on plain `x`/`y` columns the planner never used it, so we removed it and left notes in the migration on how to bring it back if we ever switch to true spatial queries. Data lives in the database, so it survives restarts and is shared by every running copy of the API.

**Thin service layer** — The heavy lifting (measuring distance and sorting nearest-first) is done by the database in SQL. The service just translates the rows into the shape the API returns.

## How I Reached the Search Design (and what I rejected)

A few things about the problem narrowed the options down:

- **Every restaurant has its own visibility radius.** This isn't "find points within X meters of me" (one fixed radius). Each row decides for itself whether it can "see" the user, so the check is `distance(user, restaurant) <= restaurant.radius` — a *per-row* condition.
- **Coordinates are simple non-negative integers on a flat grid.** No curved-earth math, no GPS — just plain `x`/`y`.
- **Results must be sorted nearest-first.**

The final design is a **two-step SQL query**: a cheap bounding-box filter (backed by B-tree indexes on `x` and `y`) to throw away far-away rows, then the exact circle check on the survivors, sorted by distance. Below is the reasoning, and the alternatives I looked at and dropped.

### Approaches Considered

#### 1. In-memory JSON Scan (Rejected)

The simplest implementation would be to load the provided JSON file into memory and iterate through all restaurants for every search request.

```text
for restaurant in restaurants:
    if distance(user, restaurant) <= restaurant.radius:
        include restaurant
```

**Pros**

- Very simple implementation
- No external dependencies
- Suitable for small datasets

**Cons**

- O(N) search complexity
- Does not scale well for larger datasets
- Dynamic updates require rewriting the JSON file
- Pagination and persistence become cumbersome

This approach was rejected because the challenge supports dynamically adding restaurants (`PUT /locations/:id`) and the data must be durable and shared across multiple stateless API instances — an in-process list can't satisfy that.

#### 2. PostgreSQL + PostGIS (Considered but Rejected)

PostGIS provides native spatial types, GiST indexes and geospatial operators such as `ST_DWithin` and `ST_Distance`.

```sql
SELECT *
FROM locations
WHERE ST_DWithin(location, user_point, max_radius);
```

**Pros**

- Industry-standard spatial database solution
- Efficient GiST indexing
- Excellent support for nearest-neighbour searches
- Supports complex geometries and GIS workloads

**Cons**

- Introduces additional operational complexity
- Requires the PostGIS extension installation
- More advanced than required for the current use case
- Restaurant visibility depends on a per-row radius, requiring additional filtering logic

PostGIS may be slightly over-engineered for this requirement since the problem only involves Cartesian coordinates and relatively small radii.

The current workload is essentially a bounded two-dimensional range query. Since restaurant radii are relatively small, bounding-box filtering already produces a highly selective candidate set. BTree indexs on x and y supports these range predicates efficiently, is smaller, cheaper to maintain, and avoids introducing generated geometry columns or PostGIS dependencies. GiST becomes more compelling when supporting nearest-neighbor searches, arbitrary shapes, spatial joins, or richer GIS functionality.

#### 3. Application-level Spatial Grid (Rejected)

Another possibility was building an in-memory spatial grid or quadtree.

**Pros**

- Efficient candidate reduction
- O(log N) lookups possible
- Independent of database technology

**Cons**

- Additional implementation complexity
- Custom indexing logic to maintain
- Reinvents capabilities already available in relational databases
- Index lives in one process — not durable, and breaks when running multiple instances

Rejected in favour of leveraging database indexing mechanisms.

#### 4. PostgreSQL + Bounding Box Filtering (Selected)

The chosen approach stores restaurants in PostgreSQL and performs a bounding-box prefilter using the maximum configured radius, then applies the exact circle check.

Two single-column B-tree indexes on `x` and `y` accelerate candidate retrieval. PostgreSQL bitmap-`AND`s them together for the two independent range filters:

**Pros**

- Simple implementation
- No PostGIS dependency
- Supports dynamic inserts naturally
- Efficient candidate pruning (~O(log N + k) instead of O(N))
- Sorting and pagination are delegated to PostgreSQL
- Scales well for datasets containing thousands to millions of rows

**Cons**

- Less flexible than a true spatial index
- The prefilter is a square, not a circle, so a few corner candidates slip through and are removed by the exact check (cheap and harmless)
- Box size depends on the largest radius in the table — one very large radius widens the box for everyone
- Would eventually need PostGIS/GiST for advanced GIS queries (regions, KNN, complex shapes)

### One more small decision: caching `MAX(radius)`

The bounding box needs the largest radius in the table. Recomputing `MAX(radius)` on every search would add work to each query, so it's cached in memory and only widened when a bigger radius is inserted. In a multi-instance deployment this cache would move to something shared (e.g. Redis or db) — that trade-off is noted in the code.


## Latency Results (summary)

| Scenario | Coordinates | Results | Cold | Warm |
|---|---|---:|---:|---:|
| **Worst-case bbox** | `x=8470, y=5802` | 6 | ~52 ms | ~2–6 ms |
| Center grid | `x=5000, y=5000` | 1 | ~6 ms | ~2–14 ms |
| Sparse corner | `x=0, y=0` | 0 | ~16 ms | ~3–14 ms |