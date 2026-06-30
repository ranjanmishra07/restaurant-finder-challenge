-- Document example: 4 restaurants from the challenge spec.
-- Run in pgAdmin Query Tool (after migrations / locations table exists).

BEGIN;

TRUNCATE TABLE locations;

INSERT INTO locations (id, name, type, opening_hours, image, x, y, radius) VALUES
  ('19e1545c-8b65-4d83-82f9-7fcad4a23114', 'Mantra Restaurant', 'Restaurant', '10:00AM-10:00PM', 'https://tinyurl.com', 2, 2, 2),
  ('19e1545c-8b65-4d83-82f9-7fcad4a23115', 'Goji',                'Restaurant', '10:00AM-11:00PM', 'https://tinyurl.com', 3, 3, 3),
  ('20e1545c-8b65-4d83-82f9-7fcad4a23114', 'Fire Tiger',          'Restaurant', '10:00AM-8:00PM',  'https://tinyurl.com', 5, 5, 5),
  ('21e1545c-8b65-4d83-82f9-7fcad4a23114', 'Deseado Steakhaus',   'Restaurant', '10:00AM-11:00PM', 'https://tinyurl.com', 4, 4, 4);

COMMIT;

-- Verify:
-- SELECT id, name, x, y, radius FROM locations ORDER BY name;
