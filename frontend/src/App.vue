<script setup lang="ts">
import 'mapbox-gl/dist/mapbox-gl.css';
</script>

<template>
    <div ref="mapContainer" class="map-container"></div>
    <div ref="shareLocationButton" class="share-location-button">Share Location</div>
</template>

<script lang="ts">
import mapboxgl from "mapbox-gl";
import { io } from "socket.io-client";

type UserMarkerLocation = {
    userId: string,
    location: mapboxgl.LngLatLike,
    marker?: mapboxgl.Marker
};

type UserLocation = Omit<UserMarkerLocation, "marker">

mapboxgl.accessToken =
    "pk.eyJ1Ijoia2FsdWNraTIzIiwiYSI6ImNqNHkxMnFzMzFvdGszM2xhYjNycW00YW8ifQ.srmLkTlTXoMc9ZyXPNH-Tw";

const SOCKET_IO_URL = 'http://localhost:8080'

let map: mapboxgl.Map | null = null;
const users: Record<string, UserMarkerLocation> = {}
const socket = io(SOCKET_IO_URL);

const createMarker = (label: string, location: mapboxgl.LngLatLike) => {
    const el = document.createElement("div");
    el.className = "marker";
    el.style.backgroundImage = `url(https://picsum.photos/seed/${label}/50/50)`;
    el.ariaLabel = `Marker with image of the ${label}`;

    el.addEventListener("click", () => {
        window.alert(label);
    });
    el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            window.alert(label);
        }
    });

    if (!map) {
        throw new Error("Map is not initialized");
    }
    return new mapboxgl.Marker(el).setLngLat(location).addTo(map);
};

const getLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
};

const onSocketConnected = async () => {
    try {
        const position = await getLocation();
        if (!socket.id) {
            console.error("Socket ID is not available");
            return;
        }
        const userLocation: UserLocation = {
            userId: socket.id,
            location: { lat: position.coords.latitude, lon: position.coords.longitude }
        };
        socket.emit("location_acquired", userLocation);
    } catch (err) {
        console.log(err)
    }
};

const onLocationUpdate = (event: UserLocation) => {
    if (!users[event.userId]) {
        const marker = createMarker(event.userId, event.location)
        users[event.userId] = { ...event, marker }
    } else {
        const user = users[event.userId]
        if (user?.marker) {
            user.marker.setLngLat(event.location)
        }
    }
};

const onUserDisconnected = (userId: string) => {
    if (users[userId]) {
        users[userId].marker?.remove()
        delete users[userId]
    }
};

export default {
    mounted() {
        map = new mapboxgl.Map({
            container: this.$refs.mapContainer as HTMLElement,
            style: "mapbox://styles/mapbox/standard",
            center: [19.9, 50.02],
            zoom: 2,
        });

        socket.on("connected", onSocketConnected);
        socket.on("location_update", onLocationUpdate);
        socket.on("user_disconnected", onUserDisconnected);

        const geoControl = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true,
            },
            trackUserLocation: true,
            showUserHeading: false,
        });

        map.addControl(geoControl);

        setTimeout(() => {
            console.log("Triggering geolocation");
            geoControl.trigger();
        }, 1000);
    },

    unmounted() {
        map?.remove();
        map = null;
        socket.disconnect();
    },
};
</script>

<style>
.map-container {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
}

.share-location-button {
    position: fixed;
    bottom: 32px;
    right: 20px;
    box-shadow: 0 0 16px rgba(0, 0, 0, 0.3);
    background-color: #efefef;
    color: #121212;
    padding: 10px 15px;
    border-radius: 50px;
    cursor: pointer;
}
</style>
