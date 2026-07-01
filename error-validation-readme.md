# API Error Validation

Manual curl verification of validation and error responses against a running server (`http://localhost:3000`).

All error responses use the same shape:

```json
{ "message": "<client-safe text>" }
```

Client messages describe the **type** of problem (missing field, exceeds max, invalid format, etc.). They do **not** expose internal limits, field paths, schema keywords, or submitted values. Full details are logged server-side only.

---

## Error message catalog

| Message | When it applies |
|---------|-----------------|
| `Unauthorized` | Missing or invalid Bearer token |
| `Location not found` | Valid UUID, no matching location (404 from controller) |
| `Required field is missing` | JSON Schema `required` / missing query param |
| `Invalid field format` | JSON Schema `pattern` / `format` failure |
| `Value exceeds the maximum allowed` | JSON Schema `maximum` (e.g. radius) |
| `Value is below the minimum allowed` | JSON Schema `minimum` (e.g. radius 0) |
| `Value exceeds the maximum allowed length` | JSON Schema `maxLength` |
| `Unexpected field in request` | Extra body/query fields (`additionalProperties: false`) |
| `Coordinate exceeds the maximum allowed value` | Service-layer x/y check (bbox-safe range) |
| `Invalid coordinate value` | Service-layer non-integer or negative coordinate |
| `Invalid coordinates` | Unparseable coordinate string (service) |
| `Bad Request` | Other 400s not mapped above |
| `Too Many Requests` | Rate limit on upsert (429) |
| `Internal Server Error` | Unhandled 5xx |

Service-layer coordinate cap: `COORDINATE_MAX = PG_INTEGER_MAX - UPSERT_RADIUS_MAX` so search bbox math (`userX ± maxRadius`) stays within PostgreSQL `INTEGER`.

---

## Live curl results

Verified against local dev server + Postgres. **All cases passed.**

### Auth

| Case | Request | HTTP | `{ message }` |
|------|---------|------|---------------|
| No token | `GET /locations/search?x=3&y=3` | **401** | `Unauthorized` |

### Search — `GET /locations/search`

| Case | Request | HTTP | `{ message }` |
|------|---------|------|---------------|
| Missing `y` | `?x=3` | **400** | `Required field is missing` |
| Negative `x` | `?x=-1&y=2` | **400** | `Invalid field format` |
| Non-integer `x` | `?x=abc&y=2` | **400** | `Invalid field format` |
| Limit too high | `?x=3&y=3&limit=101` | **400** | `Invalid field format` |
| Offset too high | `?x=3&y=3&offset=1001` | **400** | `Invalid field format` |
| Coordinate over safe max | `?x=2147483647&y=3` | **400** | `Coordinate exceeds the maximum allowed value` |
| Too many digits | `?x=12345678901&y=3` | **400** | `Value exceeds the maximum allowed length` |
| Valid search | `?x=3&y=3` | **200** | *(location list)* |

### Get by ID — `GET /locations/:id`

| Case | Request | HTTP | `{ message }` |
|------|---------|------|---------------|
| Invalid UUID | `/locations/not-a-uuid` | **400** | `Invalid field format` |
| Unknown ID | `/locations/51e1545c-8b65-4d83-82f9-7fcad4a23199` | **404** | `Location not found` |

### Upsert — `PUT /locations/:id`

| Case | Payload note | HTTP | `{ message }` |
|------|--------------|------|---------------|
| Missing `radius` | Omit `radius` | **400** | `Required field is missing` |
| Radius zero | `"radius": 0` | **400** | `Value is below the minimum allowed` |
| Bad coordinates | `"coordinates": "invalid"` | **400** | `Invalid field format` |
| Extra field | `"extra": "field"` | **400** | `Unexpected field in request` |
| Non-HTTPS image | `"image": "http://..."` | **400** | `Invalid field format` |
| Name too long | 256 characters | **400** | `Value exceeds the maximum allowed length` |
| Coordinate over safe max | `"coordinates": "x=2147483647,y=3"` | **400** | `Coordinate exceeds the maximum allowed value` |
| Radius too high | `"radius": 1001` | **400** | `Value exceeds the maximum allowed` |
| Valid upsert | Standard seed payload | **200** | *(location detail)* |

---

## How to reproduce

```bash
BASE=http://localhost:3000

# Token
TOKEN=$(curl -s -X POST "$BASE/auth/token" \
  -H 'Content-Type: application/json' \
  -d '{"role":"user"}' | jq -r .token)

# 401 — no token
curl -s "$BASE/locations/search?x=3&y=3" | jq

# 400 — coordinate exceeds safe max (service layer)
curl -s "$BASE/locations/search?x=2147483647&y=3" \
  -H "Authorization: Bearer $TOKEN" | jq

# 400 — radius exceeds max (schema)
curl -s -X PUT "$BASE/locations/51e1545c-8b65-4d83-82f9-7fcad4a23111" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","type":"Restaurant","opening-hours":"10-11","image":"https://example.com/x.png","coordinates":"x=5,y=5","radius":1001}' | jq

# 404 — location not found
curl -s "$BASE/locations/51e1545c-8b65-4d83-82f9-7fcad4a23199" \
  -H "Authorization: Bearer $TOKEN" | jq

# 200 — valid search
curl -s "$BASE/locations/search?x=3&y=3" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Automated tests

Same behaviour is covered in:

- `tests/validation.test.ts` — HTTP validation via Fastify inject
- `tests/location.service.test.ts` — service-layer coordinate checks
- `tests/app.test.ts` — 401, 404, 500 response shapes

Run:

```bash
npm test
```
