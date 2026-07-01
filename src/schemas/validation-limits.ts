/**
 * JSON Schema input bounds — practical defaults for this challenge.
 * Adjust per domain requirements. In production, limits may be sourced from:
 * env/static config, feature flags (LaunchDarkly, Unleash), remote config
 * (AWS AppConfig), or a cached DB/Redis global config store.
 */
export const COORDINATE_MAX_DIGITS = 10;

/** PostgreSQL INTEGER upper bound (2^31 - 1). */
export const PG_INTEGER_MAX = 2_147_483_647;

export const SEARCH_MAX_LIMIT = 100;
export const SEARCH_MAX_OFFSET = 1_000;

/** Max visibility radius on the Cartesian grid. */
export const UPSERT_RADIUS_MAX = 1_000;

/**
 * Max allowed x/y so that coordinate ± maxRadius stays within PostgreSQL INTEGER
 * (search bbox uses userX ± maxRadius in INTEGER arithmetic).
 */
export const COORDINATE_MAX = PG_INTEGER_MAX - UPSERT_RADIUS_MAX;

export const UPSERT_NAME_MAX_LENGTH = 255;
export const UPSERT_TYPE_MAX_LENGTH = 100;
export const UPSERT_OPENING_HOURS_MAX_LENGTH = 500;
export const UPSERT_IMAGE_MAX_LENGTH = 2048;
