# Large-data search latency (10k locations)

Quick notes from seeding `data/locations_big.json` (10,000 rows) and benchmarking `GET /locations/search`.

# Start server
DATABASE_URL='postgresql://user:password@localhost:5432/restaurant_finder' \
node dist/index.js
```

## Worst-case search point

For this dataset (`maxRadius = 99`), the densest bounding-box area is:

```
GET /locations/search?x=8470&y=5802
```

- **15** rows pass the bbox prefilter (most for any point)
- **6** rows pass the exact radius check

## Example curl

```bash
# 1) Get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/token \
  -H 'Content-Type: application/json' -d '{}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 2) Worst-case search + timing
curl -s -o /dev/null -w "http_total_ms=%{time_total}\n" \
  "http://localhost:3000/locations/search?x=8470&y=5802" \
  -H "Authorization: Bearer $TOKEN"
```

## Results (summary)

| Scenario | Coordinates | Results | Cold | Warm |
|---|---|---:|---:|---:|
| **Worst-case bbox** | `x=8470, y=5802` | 6 | ~52 ms | ~2–6 ms |
| Center grid | `x=5000, y=5000` | 1 | ~6 ms | ~2–14 ms |
| Sparse corner | `x=0, y=0` | 0 | ~16 ms | ~3–14 ms |

- **App log field:** `latencyMs` on `event: location_search`
- **curl field:** `http_total_ms` (includes network + auth overhead)

With 10k rows, worst-case search stays fast because the B-tree bbox prune keeps candidates small (max ~15 for this file).
