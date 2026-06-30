import type pg from 'pg';
import {
  fromDbRow,
  toLocationFromUpsertInput,
} from '../models/location.mapper.js';
import type {
  Location,
  LocationDbRow,
  LocationSearchRow,
  LocationUpsertInput,
} from '../models/location.model.js';

export class LocationRepository {
  // in distributed system, this would be a global variable and stored in a cache like redis or a config db
  private maxRadius = 1;

  constructor(private pool: pg.Pool) {}

  // this is a function to refresh the max radius from the database. This is needed because the max radius is not stored in the database, but is calculated from the data in the database.
  async refreshMaxRadius(): Promise<number> {
    const result = await this.pool.query<{ max_radius: number | null }>(
      'SELECT MAX(radius) AS max_radius FROM locations',
    );
    this.maxRadius = Number(result.rows[0]?.max_radius ?? 1);
    return this.maxRadius;
  }

  async findById(id: string): Promise<Location | null> {
    const result = await this.pool.query<LocationDbRow>(
      `SELECT id, name, type, opening_hours, image, x, y, radius
       FROM locations
       WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    return row ? fromDbRow(row) : null;
  }

  /**
   * Find restaurants that can "see" the user at (x, y).
   * A restaurant counts if the user is within its radius (distance <= radius).
   * We first skip far-away rows using maxRadius, then apply the exact check and sort by distance.
   */
  async searchVisible(
    x: number,
    y: number,
    limit = 20,
    offset = 0,
  ): Promise<LocationSearchRow[]> {
    const result = await this.pool.query<LocationSearchRow & { radius: number }>(
      `SELECT
         id,
         name,
         x,
         y,
         sqrt(power(x - $1, 2) + power(y - $2, 2)) AS distance
       FROM locations
       WHERE
         x BETWEEN $1 - $3 AND $1 + $3
         AND y BETWEEN $2 - $3 AND $2 + $3
         AND power(x - $1, 2) + power(y - $2, 2) <= power(radius, 2)
       ORDER BY distance ASC
       LIMIT $4 OFFSET $5`,
      [x, y, this.maxRadius, limit, offset],
    );

    return result.rows.map(({ id, name, x: locX, y: locY, distance }) => ({
      id,
      name,
      x: locX,
      y: locY,
      distance: Number(distance),
    }));
  }

  async upsert(input: LocationUpsertInput): Promise<Location> {
    const location = toLocationFromUpsertInput(input);

    const result = await this.pool.query<LocationDbRow>(
      `INSERT INTO locations (id, name, type, opening_hours, image, x, y, radius)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         type = EXCLUDED.type,
         opening_hours = EXCLUDED.opening_hours,
         image = EXCLUDED.image,
         x = EXCLUDED.x,
         y = EXCLUDED.y,
         radius = EXCLUDED.radius
       RETURNING id, name, type, opening_hours, image, x, y, radius`,
      [
        location.id,
        location.name,
        location.type,
        location.openingHours,
        location.image,
        location.x,
        location.y,
        location.radius,
      ],
    );

    if (location.radius > this.maxRadius) {
      this.maxRadius = location.radius; //In distributed system, this would be a global variable and stored in a cache like redis or a config db
    }

    return fromDbRow(result.rows[0]);
  }
}



/*
Query Explanation of searchVisible function:

This query answers: **“Which restaurants can see the user at `(x, y)`, and how far is each one?”**

Parameters passed in: `[x, y, this.maxRadius]` → `$1 = user x`, `$2 = user y`, `$3 = maxRadius`.

---

### What “visible” means

Each restaurant sits at `(x, y)` with its own **radius**. The user at `(ux, uy)` is visible to that restaurant if:

```
distance(user, restaurant) ≤ restaurant.radius
```

That is the same as:

```
(ux - rx)² + (uy - ry)² ≤ radius²
```

The query implements exactly that.

---

### SELECT — what comes back

```sql
sqrt(power(x - $1, 2) + power(y - $2, 2)) AS distance
```

This is the **Euclidean distance** from the restaurant center to the user.  
`sqrt` is only used here for the **response** (the API returns `distance` rounded to 6 decimal places, e.g. `1.414214`).

---

### WHERE — two steps

**Step 1 — quick box filter (performance):**

```sql
x BETWEEN $1 - $3 AND $1 + $3
AND y BETWEEN $2 - $3 AND $2 + $3
```

Only consider restaurants whose center is inside a square around the user:

```
[userX ± maxRadius, userY ± maxRadius]
```

`maxRadius` is the **largest radius in the whole table** (cached in `this.maxRadius`).  
No restaurant can reach the user from farther than that, so anything outside this box is impossible to match.

This narrows the search before the expensive per-row check (PostgreSQL uses B-tree indexes on `x` and `y` for this bbox).

**Step 2 — exact visibility check:**

```sql
power(x - $1, 2) + power(y - $2, 2) <= power(radius, 2)
```

For each candidate, check whether the user is **inside that restaurant’s circle**.  
Each row can have a **different** `radius`, so this can’t be a single fixed-radius search.

Note: comparison uses **squared distance** (no `sqrt`) — same result, cheaper.

---

### ORDER BY

```sql
ORDER BY distance ASC
```

Closest restaurants first — required by the challenge.

---

### Concrete example

User at `(3, 2)`, restaurant at `(2, 2)` with `radius = 4`:

- Distance = `sqrt((3-2)² + (2-2)²) = 1`
- `1 ≤ 4` → **included**

Restaurant at `(100, 100)` with `radius = 5`:

- Fails the bbox filter if `maxRadius` is e.g. `10` (center too far from `(3,2)`)
- Even if it passed bbox, `(100-3)² + (100-2)²` would far exceed `5²` → **excluded**

---

*/