import mapboxgl from 'mapbox-gl';
import type { UserLocation, UserMarkerLocation } from '@/types/user.types';
import socket from './sockets';

mapboxgl.accessToken =
    'pk.eyJ1Ijoia2FsdWNraTIzIiwiYSI6ImNqNHkxMnFzMzFvdGszM2xhYjNycW00YW8ifQ.srmLkTlTXoMc9ZyXPNH-Tw';

let userMap: mapboxgl.Map | null = null;
const users: Record<string, UserMarkerLocation> = {};
let currentUser: UserLocation | null = null;

const createPath = async (start: [number, number], end: [number, number]) => {
    if (!userMap) {
        throw new Error('Map is not initialized');
    }

    const response = await fetch(
        `https://brouter.de/brouter?lonlats=${start[0]},${start[1]}|${end[0]},${end[1]}&profile=trekking&alternativeidx=0&format=geojson`,
    );
    const data = await response.json();

    const route = data.features[0].geometry;
    console.log(data);

    const source = userMap.getSource('route') as mapboxgl.GeoJSONSource;
    if (source) {
        source.setData(data);
    }
};

const coordsToArray = (location: mapboxgl.LngLatLike): [number, number] => {
    if (Array.isArray(location)) {
        return [location[0], location[1]];
    } else if ('lng' in location && 'lat' in location) {
        return [location.lng, location.lat];
    } else if ('lon' in location && 'lat' in location) {
        return [location.lon, location.lat];
    } else {
        throw new Error('Invalid location format'); 
    }
};

const createMarker = (label: string, location: mapboxgl.LngLatLike) => {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = `url(https://picsum.photos/seed/${label}/50/50)`;
    el.ariaLabel = `Marker with image of the ${label}`;

    el.addEventListener('click', () => {
        if (!currentUser) return;
        const locA = coordsToArray(location);
        const locB = coordsToArray(currentUser.location);
        createPath(locA, locB);
    });

    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            el.click();
        }
    });

    if (!userMap) {
        throw new Error('Map is not initialized');
    }
    return new mapboxgl.Marker(el).setLngLat(location).addTo(userMap);
};

const onLocationChanged = (position: GeolocationPosition) => {
    const userLocation: UserLocation = {
        userId: socket.id(),
        location: { lat: position.coords.latitude, lon: position.coords.longitude },
    };
    currentUser = userLocation;
    socket.emitUserLocation(userLocation);
};

const registerLocationChangeListener = () => {
    navigator.geolocation.watchPosition(onLocationChanged, console.error);
};

const updateUser = ({ userId, location }: UserLocation) => {
    if (!users[userId]) {
        const marker = createMarker(userId, location);
        users[userId] = { userId, location, marker };
    } else {
        const user = users[userId];
        if (user?.marker) {
            user.marker.setLngLat(location);
        }
    }
};

const initState = (initialUsers: UserLocation[]) => {
    for (const user of initialUsers) {
        updateUser(user);
    }
};

const removeUser = (userId: string) => {
    if (users[userId]) {
        users[userId].marker?.remove();
        delete users[userId];
    }
};

const toggleStyle = (): string => {
    if (!userMap) {
        throw new Error('Map is not initialized');
    }
    const style = userMap.getStyle();
    const newStyleId = style.sprite?.includes('satellite') ? 'standard' : 'satellite-v9';
    userMap.setStyle(`mapbox://styles/mapbox/${newStyleId}`);
    return newStyleId;
};

const getTileUrl = (styleId: string) => {
    return `https://api.mapbox.com/styles/v1/mapbox/${styleId}/tiles/10/567/347?access_token=${mapboxgl.accessToken}`;
};

const searchAddress = async (query: string): Promise<{ lat: number; lon: number } | null> => {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&limit=1&format=jsonv2`,
    );
    const data = await response.json();
    if (data.length === 0) {
        return null;
    }
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
};

const flyTo = (location: mapboxgl.LngLatLike) => {
    if (!userMap) {
        throw new Error('Map is not initialized');
    }

    userMap.flyTo({ center: location, zoom: 14, duration: 1000 });
};

const onMapLoad = () => {
    userMap?.addSource('route', {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': []
        }
    });

    userMap?.addLayer({
        'id': 'route',
        'type': 'line',
        'source': 'route',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#888',
            'line-width': 8
        }
    });
};

const init = (container: HTMLElement) => {
    userMap = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/standard',
        center: [19.9, 50.02],
        zoom: 2,
    });

    const geoControl = new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: false,
    });

    userMap.addControl(geoControl);

    userMap.on('load', onMapLoad);

    socket.onConnected(registerLocationChangeListener);
    socket.onInitState(initState);
    socket.onUserLocationUpdate(updateUser);
    socket.onUserDisconnected(removeUser);

    setTimeout(() => geoControl.trigger(), 1000);
};

const destroy = () => {
    if (userMap) {
        userMap.remove();
        userMap = null;
    }
};

export default {
    init,
    destroy,
    toggleStyle,
    getTileUrl,
    searchAddress,
    flyTo,
};
