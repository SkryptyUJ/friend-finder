import mapboxgl from 'mapbox-gl';
import type { UserLocation, UserMarkerLocation } from '@/types/user.types';
import socket from './sockets';

mapboxgl.accessToken =
    'pk.eyJ1Ijoia2FsdWNraTIzIiwiYSI6ImNqNHkxMnFzMzFvdGszM2xhYjNycW00YW8ifQ.srmLkTlTXoMc9ZyXPNH-Tw';

let userMap: mapboxgl.Map | null = null;
const users: Record<string, UserMarkerLocation> = {};

const createMarker = (label: string, location: mapboxgl.LngLatLike) => {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = `url(https://picsum.photos/seed/${label}/50/50)`;
    el.ariaLabel = `Marker with image of the ${label}`;

    el.addEventListener('click', () => {
        window.alert(label);
    });
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            window.alert(label);
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
