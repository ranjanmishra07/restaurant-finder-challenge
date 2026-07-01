CREATE TABLE IF NOT EXISTS locations (
  id            UUID PRIMARY KEY,
  name          TEXT        NOT NULL,
  type          TEXT        NOT NULL,
  opening_hours TEXT        NOT NULL,
  image         TEXT        NOT NULL,
  x             INTEGER     NOT NULL CHECK (x >= 0),
  y             INTEGER     NOT NULL CHECK (y >= 0),
  radius        INTEGER     NOT NULL CHECK (radius >= 1)
  -- GiST / spatial column (disabled — see index section below):
  -- geom          point       GENERATED ALWAYS AS (point(x, y)) STORED
);

-- B-tree indexes on x and y support the searchVisible bbox filter:
--   x BETWEEN userX ± maxRadius AND y BETWEEN userY ± maxRadius
-- PostgreSQL can bitmap-combine both indexes for O(log N + k) candidate lookup.
CREATE INDEX IF NOT EXISTS locations_x_idx ON locations (x);
CREATE INDEX IF NOT EXISTS locations_y_idx ON locations (y);

-- GiST spatial index (might be useful in the future depending on the data size and queries):
--
-- How to add later (e.g. PostGIS or native point at scale):
--   1. ALTER TABLE locations ADD COLUMN geom point GENERATED ALWAYS AS (point(x, y)) STORED;
--   2. CREATE INDEX locations_geom_gist_idx ON locations USING GIST (geom);
--   3. Rewrite searchVisible to use spatial operators on geom, e.g.:
--        geom <@ box(point($1 - $3, $2 - $3), point($1 + $3, $2 + $3))
--      or install PostGIS and use ST_DWithin / KNN (<->) for nearest-neighbor ordering.
--   GiST shines when queries are expressed in spatial terms (regions, distance ordering);
--   prefer it over dual B-tree when data grows large and we need KNN or complex shapes in the future.
--
-- CREATE INDEX IF NOT EXISTS locations_geom_gist_idx
--   ON locations USING GIST (geom);
