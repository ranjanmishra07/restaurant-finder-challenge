/** Decimal places for distance in API responses (6 dp — common geo API precision). */
export const DISTANCE_DECIMAL_PLACES = 4;

export function roundDistance(distance: number): number {
  const factor = 10 ** DISTANCE_DECIMAL_PLACES;
  return Math.round(distance * factor) / factor;
}

export function squaredDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return (x2 - x1) ** 2 + (y2 - y1) ** 2;
}

export function euclideanDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.sqrt(squaredDistance(x1, y1, x2, y2));
}
