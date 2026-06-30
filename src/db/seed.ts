import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { createPool, closePool } from './pool.js';
import { runMigrations } from './migrate.js';
import { fromLocationApiRecord, type LocationApiRecord } from '../models/location.mapper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

function isDirectRun(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url)));
}

interface LocationsFile {
  locations: LocationApiRecord[];
}

export async function seedLocations(
  pool: import('pg').Pool,
  filePath = env.locationsFile,
): Promise<number> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(projectRoot, filePath);
  const raw = await readFile(absolutePath, 'utf-8');
  const data = JSON.parse(raw) as LocationsFile;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const record of data.locations) {
      const location = fromLocationApiRecord(record);
      await client.query(
        `INSERT INTO locations (id, name, type, opening_hours, image, x, y, radius)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           opening_hours = EXCLUDED.opening_hours,
           image = EXCLUDED.image,
           x = EXCLUDED.x,
           y = EXCLUDED.y,
           radius = EXCLUDED.radius`,
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
    }

    await client.query('ANALYZE locations');
    await client.query('COMMIT');
    return data.locations.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const pool = createPool();
  try {
    await runMigrations(pool);
    const count = await seedLocations(pool);
    console.log(`Seeded ${count} locations`);
  } finally {
    await closePool();
  }
}

if (isDirectRun()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
