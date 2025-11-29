<script setup lang="ts">
import "mapbox-gl/dist/mapbox-gl.css";
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
}

type UserLocation = Omit<UserMarkerLocation, "marker">

mapboxgl.accessToken =
  "pk.eyJ1Ijoia2FsdWNraTIzIiwiYSI6ImNqNHkxMnFzMzFvdGszM2xhYjNycW00YW8ifQ.srmLkTlTXoMc9ZyXPNH-Tw";

const SOCKET_IO_URL = 'http://localhost:8080'
  
let map: mapboxgl.Map | null = null;
const socket = io(SOCKET_IO_URL);

const ICON_SIZE = 50;

const createMarker = (label: string, location: mapboxgl.LngLatLike) => {
  const el = document.createElement("div");
  const width = ICON_SIZE;
  const height = ICON_SIZE;
  el.className = "marker";
  el.style.backgroundImage = `url(https://picsum.photos/seed/${label}/${width}/${height})`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.backgroundSize = "100%";
  el.style.borderRadius = "50%";
  el.style.border = "3px solid white";
  el.tabIndex = 0;
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
}

export default {
  mounted() {
    const users: Record<string, UserMarkerLocation> = {}

    map = new mapboxgl.Map({
      container: this.$refs.mapContainer as HTMLElement,
      style: "mapbox://styles/mapbox/standard",
      center: [19.9, 50.02],
      zoom: 2,
    });

    socket.on("connected", () => {
      const success = (position: GeolocationPosition) => {
        if (!socket.id) {
          console.error("Socket ID is not available");
          return;
        }
        socket.emit("location_acquired", {
          userId: socket.id, location: { lat: position.coords.latitude, lon: position.coords.longitude }
        } satisfies UserLocation)
      }

      const error = (err: GeolocationPositionError) => {
        console.log(err)
      }

      window.navigator.geolocation.getCurrentPosition(success, error);
    });

    socket.on("location_update", (event: UserLocation) => {
      if (!users[event.userId]) {
        const marker = createMarker(event.userId, event.location)
        users[event.userId] = { ...event, marker }
      } else {
        const user = users[event.userId]
        if (user?.marker) {
          user.marker.setLngLat(event.location)
        }
      }
    })

    socket.on("user_disconnected", (userId: string) => {
      if (users[userId]) {
        users[userId].marker?.remove()
        delete users[userId]
      }
    })

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
    socket.disconnect()
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
