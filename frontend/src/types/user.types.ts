import type { LngLatLike, Marker } from 'mapbox-gl';

export type UserMarkerLocation = {
    userId: string;
    location: LngLatLike;
    marker?: Marker;
};

export type UserLocation = Omit<UserMarkerLocation, 'marker'>;
