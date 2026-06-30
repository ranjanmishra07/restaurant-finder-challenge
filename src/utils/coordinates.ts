export function parseCoordinates(coordinates: string): { x: number; y: number } {
  const match = coordinates.match(/^x=(\d+),y=(\d+)$/);
  if (!match) {
    throw new Error(`Invalid coordinates format: ${coordinates}`);
  }
  return { x: Number(match[1]), y: Number(match[2]) };
}

export function formatCoordinates(x: number, y: number): string {
  return `x=${x},y=${y}`;
}
