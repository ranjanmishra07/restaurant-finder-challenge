import { ApiField } from './api-fields.js';
import type {
  Location,
  LocationDetail,
  LocationSearchItem,
  LocationSearchResult,
  LocationSearchRow,
  LocationDbRow,
  LocationUpsertInput,
} from './location.model.js';
import { formatCoordinates, parseCoordinates } from '../utils/coordinates.js';
import { roundDistance } from '../utils/distance.js';

export type LocationDetailApi = {
  id: string;
  name: string;
  type: string;
  image: string;
  coordinates: string;
} & Record<typeof ApiField.OPENING_HOURS, string>;

export type LocationSearchApi = {
  locations: Array<{
    id: string;
    name: string;
    coordinates: string;
    distance: number;
  }>;
} & Record<typeof ApiField.USER_LOCATION, string>;

export type LocationUpsertApiBody = {
  name: string;
  type: string;
  image: string;
  coordinates: string;
  radius: number;
} & Record<typeof ApiField.OPENING_HOURS, string>;

export type LocationApiRecord = {
  id: string;
  name: string;
  type: string;
  image: string;
  coordinates: string;
  radius: number;
} & Record<typeof ApiField.OPENING_HOURS, string>;

export function toLocationDetailApi(detail: LocationDetail): LocationDetailApi {
  return {
    id: detail.id,
    name: detail.name,
    type: detail.type,
    image: detail.image,
    coordinates: detail.coordinates,
    [ApiField.OPENING_HOURS]: detail.openingHours,
  };
}

export function toLocationSearchApi(result: LocationSearchResult): LocationSearchApi {
  return {
    [ApiField.USER_LOCATION]: result.userLocation,
    locations: result.locations,
  };
}

export function fromLocationUpsertApiBody(
  id: string,
  body: LocationUpsertApiBody,
): LocationUpsertInput {
  return {
    id,
    name: body.name,
    type: body.type,
    openingHours: body[ApiField.OPENING_HOURS],
    image: body.image,
    coordinates: body.coordinates,
    radius: body.radius,
  };
}

export function fromLocationApiRecord(record: LocationApiRecord): Location {
  const { x, y } = parseCoordinates(record.coordinates);
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    openingHours: record[ApiField.OPENING_HOURS],
    image: record.image,
    coordinates: record.coordinates,
    x,
    y,
    radius: record.radius,
  };
}

export function fromDbRow(row: LocationDbRow): Location {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    openingHours: row.opening_hours,
    image: row.image,
    x: row.x,
    y: row.y,
    radius: row.radius,
    coordinates: formatCoordinates(row.x, row.y),
  };
}

export function toLocationSearchItem(row: LocationSearchRow): LocationSearchItem {
  return {
    id: row.id,
    name: row.name,
    coordinates: formatCoordinates(row.x, row.y),
    distance: roundDistance(row.distance),
  };
}

export function toLocationDetail(location: Location): LocationDetail {
  return {
    id: location.id,
    name: location.name,
    type: location.type,
    openingHours: location.openingHours,
    image: location.image,
    coordinates: location.coordinates,
  };
}

export function toLocationFromUpsertInput(input: LocationUpsertInput): Location {
  const { x, y } = parseCoordinates(input.coordinates);
  return {
    id: input.id,
    name: input.name,
    type: input.type,
    openingHours: input.openingHours,
    image: input.image,
    coordinates: input.coordinates,
    x,
    y,
    radius: input.radius,
  };
}
