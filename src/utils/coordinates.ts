import { API_ERROR_MESSAGES } from './api-error-messages.js';
import { AppError } from './app-error.js';
import { COORDINATE_MAX } from '../schemas/validation-limits.js';

export function assertCoordinateInRange(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new AppError(API_ERROR_MESSAGES.COORDINATE_INVALID, 400);
  }
  if (value > COORDINATE_MAX) {
    throw new AppError(API_ERROR_MESSAGES.COORDINATE_EXCEEDS_MAX, 400);
  }
}

export function parseCoordinates(coordinates: string): { x: number; y: number } {
  const match = coordinates.match(/^x=(\d+),y=(\d+)$/);
  if (!match) {
    throw new AppError(API_ERROR_MESSAGES.INVALID_COORDINATES, 400);
  }
  return { x: Number(match[1]), y: Number(match[2]) };
}

export function formatCoordinates(x: number, y: number): string {
  return `x=${x},y=${y}`;
}
