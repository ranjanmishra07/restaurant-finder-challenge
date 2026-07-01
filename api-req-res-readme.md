# API Request / Response Reference

Live curl verification against `http://localhost:3000` (dev server + Postgres).

**Run date:** 2026-07-01  
**Result:** 26 / 26 cases passed

Use a token for protected routes:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"role":"user"}' | jq -r .token)
```

---

## Summary

| Endpoint | Cases | 200 | 400 | 401 | 404 |
|----------|------:|----:|----:|----:|----:|
| `POST /auth/token` | 1 | 1 | — | — | — |
| `GET /locations/search` | 11 | 3 | 7 | 1 | — |
| `GET /locations/:id` | 4 | 1 | 1 | 1 | 1 |
| `PUT /locations/:id` | 10 | 1 | 8 | 1 | — |

---

## 1. Auth

### 1.1 Issue token — success

**Request**
```http
POST /auth/token
Content-Type: application/json

{"role":"user"}
```

**curl**
```bash
curl -s -X POST http://localhost:3000/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"role":"user"}'
```

**Response `200`**
```json
{
  "token": "<JWT>",
  "role": "user"
}
```

---

## 2. Search — `GET /locations/search`

All location routes require `Authorization: Bearer <token>` except where noted.

### 2.1 No token

**Request**
```http
GET /locations/search?x=3&y=3
```

**Response `401`**
```json
{ "message": "Unauthorized" }
```

---

### 2.2 Valid search

**Request**
```http
GET /locations/search?x=3&y=3
Authorization: Bearer <token>
```

**Response `200`**
```json
{
  "user-location": "x=3,y=3",
  "locations": [
    {
      "id": "19e1545c-8b65-4d83-82f9-7fcad4a23115",
      "name": "Goji",
      "coordinates": "x=3,y=3",
      "distance": 0
    },
    {
      "id": "21e1545c-8b65-4d83-82f9-7fcad4a23114",
      "name": "Deseado Steakhaus",
      "coordinates": "x=4,y=4",
      "distance": 1.4142
    }
  ]
}
```
*(10 locations returned, sorted by distance)*

---

### 2.3 Pagination — limit & offset

**Request**
```http
GET /locations/search?x=3&y=3&limit=2&offset=1
Authorization: Bearer <token>
```

**Response `200`**
```json
{
  "user-location": "x=3,y=3",
  "locations": [
    {
      "id": "19e1545c-8b65-4d83-82f9-7fcad4a23114",
      "name": "Mantra Restaurant",
      "coordinates": "x=2,y=2",
      "distance": 1.4142
    },
    {
      "id": "21e1545c-8b65-4d83-82f9-7fcad4a23114",
      "name": "Deseado Steakhaus",
      "coordinates": "x=4,y=4",
      "distance": 1.4142
    }
  ]
}
```

---

### 2.4 Empty results (sparse coordinates)

**Request**
```http
GET /locations/search?x=0&y=0
Authorization: Bearer <token>
```

**Response `200`**
```json
{
  "user-location": "x=0,y=0",
  "locations": []
}
```

---

### 2.5 Missing required query param (`y`)

**Request**
```http
GET /locations/search?x=3
Authorization: Bearer <token>
```

**Response `400`**
```json
{ "message": "Required field is missing" }
```

---

### 2.6 Negative coordinate

**Request**
```http
GET /locations/search?x=-1&y=2
Authorization: Bearer <token>
```

**Response `400`**
```json
{ "message": "Invalid field format" }
```

---

### 2.7 Non-integer coordinate

**Request**
```http
GET /locations/search?x=abc&y=2
Authorization: Bearer <token>
```

**Response `400`**
```json
{ "message": "Invalid field format" }
```

---

### 2.8 Limit exceeds max

**Request**
```http
GET /locations/search?x=3&y=3&limit=101
Authorization: Bearer <token>
```

**Response `400`**
```json
{ "message": "Invalid field format" }
```

---

### 2.9 Offset exceeds max

**Request**
```http
GET /locations/search?x=3&y=3&offset=1001
Authorization: Bearer <token>
```

**Response `400`**
```json
{ "message": "Invalid field format" }
```

---

### 2.10 Coordinate exceeds safe max (service layer)

**Request**
```http
GET /locations/search?x=2147483647&y=3
Authorization: Bearer <token>
```

**Response `400`**
```json
{ "message": "Coordinate exceeds the maximum allowed value" }
```

---

### 2.11 Coordinate too many digits

**Request**
```http
GET /locations/search?x=12345678901&y=3
Authorization: Bearer <token>
```

**Response `400`**
```json
{ "message": "Value exceeds the maximum allowed length" }
```

---

## 3. Get location — `GET /locations/:id`

### 3.1 No token

**Request**
```http
GET /locations/51e1545c-8b65-4d83-82f9-7fcad4a23111
```

**Response `401`**
```json
{ "message": "Unauthorized" }
```

---

### 3.2 Valid ID

**Request**
```http
GET /locations/51e1545c-8b65-4d83-82f9-7fcad4a23111
Authorization: Bearer <token>
```

**Response `200`**
```json
{
  "id": "51e1545c-8b65-4d83-82f9-7fcad4a23111",
  "name": "Da Jia Le",
  "type": "Restaurant",
  "opening-hours": "10:00AM-8:00PM",
  "image": "https://tinyurl.com",
  "coordinates": "x=8,y=8"
}
```

---

### 3.3 Invalid UUID

**Request**
```http
GET /locations/not-a-uuid
Authorization: Bearer <token>
```

**Response `400`**
```json
{ "message": "Invalid field format" }
```

---

### 3.4 Location not found

**Request**
```http
GET /locations/51e1545c-8b65-4d83-82f9-7fcad4a23199
Authorization: Bearer <token>
```

**Response `404`**
```json
{ "message": "Location not found" }
```

---

## 4. Upsert location — `PUT /locations/:id`

Valid body template:
```json
{
  "name": "Da Jia Le",
  "type": "Restaurant",
  "opening-hours": "10:00AM-11:00PM",
  "image": "https://tinyurl.com",
  "coordinates": "x=5,y=5",
  "radius": 1
}
```

### 4.1 No token

**Request**
```http
PUT /locations/51e1545c-8b65-4d83-82f9-7fcad4a23111
Content-Type: application/json

{ ...valid body... }
```

**Response `401`**
```json
{ "message": "Unauthorized" }
```

---

### 4.2 Valid upsert

**Request**
```http
PUT /locations/51e1545c-8b65-4d83-82f9-7fcad4a23111
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Da Jia Le",
  "type": "Restaurant",
  "opening-hours": "10:00AM-11:00PM",
  "image": "https://tinyurl.com",
  "coordinates": "x=5,y=5",
  "radius": 1
}
```

**Response `200`**
```json
{
  "id": "51e1545c-8b65-4d83-82f9-7fcad4a23111",
  "name": "Da Jia Le",
  "type": "Restaurant",
  "opening-hours": "10:00AM-11:00PM",
  "image": "https://tinyurl.com",
  "coordinates": "x=5,y=5"
}
```

---

### 4.3 Missing required field (`radius`)

**Request body** — omit `radius`

**Response `400`**
```json
{ "message": "Required field is missing" }
```

---

### 4.4 Radius below minimum

**Request body** — `"radius": 0`

**Response `400`**
```json
{ "message": "Value is below the minimum allowed" }
```

---

### 4.5 Invalid coordinates format

**Request body** — `"coordinates": "invalid"`

**Response `400`**
```json
{ "message": "Invalid field format" }
```

---

### 4.6 Unexpected extra field

**Request body** — includes `"extra": "field"`

**Response `400`**
```json
{ "message": "Unexpected field in request" }
```

---

### 4.7 Non-HTTPS image URL

**Request body** — `"image": "http://example.com/x.png"`

**Response `400`**
```json
{ "message": "Invalid field format" }
```

---

### 4.8 Name exceeds max length

**Request body** — `"name"` with 256 characters

**Response `400`**
```json
{ "message": "Value exceeds the maximum allowed length" }
```

---

### 4.9 Coordinate exceeds safe max (service layer)

**Request body** — `"coordinates": "x=2147483647,y=3"`

**Response `400`**
```json
{ "message": "Coordinate exceeds the maximum allowed value" }
```

---

### 4.10 Radius exceeds max

**Request body** — `"radius": 1001`

**Response `400`**
```json
{ "message": "Value exceeds the maximum allowed" }
```

---

## Re-run all cases

```bash
# Start dependencies
docker compose up -d postgres
npm run dev   # in another terminal

# Example checks
curl -s http://localhost:3000/locations/search?x=3&y=3 \
  -H "Authorization: Bearer $TOKEN" | jq

curl -s -X PUT http://localhost:3000/locations/51e1545c-8b65-4d83-82f9-7fcad4a23111 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Da Jia Le","type":"Restaurant","opening-hours":"10:00AM-11:00PM","image":"https://tinyurl.com","coordinates":"x=5,y=5","radius":1}' | jq
```

See also: [error-validation-readme.md](./error-validation-readme.md) for error message catalog.
