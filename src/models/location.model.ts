export interface Location {
  id: string;
  name: string;
  type: string;
  openingHours: string;
  image: string;
  coordinates: string;
  x: number;
  y: number;
  radius: number;
}

export interface LocationSearchItem {
  id: string;
  name: string;
  coordinates: string;
  distance: number;
}

export interface LocationSearchRow {
  id: string;
  name: string;
  x: number;
  y: number;
  distance: number;
}

export interface LocationSearchPagination {
  limit: number;
  offset: number;
}

export interface LocationSearchResult {
  userLocation: string;
  locations: LocationSearchItem[];
}

export interface LocationDetail {
  id: string;
  name: string;
  type: string;
  openingHours: string;
  image: string;
  coordinates: string;
}

export interface LocationUpsertInput {
  id: string;
  name: string;
  type: string;
  openingHours: string;
  image: string;
  coordinates: string;
  radius: number;
}

export interface LocationDbRow {
  id: string;
  name: string;
  type: string;
  opening_hours: string;
  image: string;
  x: number;
  y: number;
  radius: number;
}
