<script setup lang="ts">
import "mapbox-gl/dist/mapbox-gl.css";
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
  <div ref="shareLocationButton" class="share-location-button">Share Location</div>
</template>

<script lang="ts">
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken =
  "pk.eyJ1Ijoia2FsdWNraTIzIiwiYSI6ImNqNHkxMnFzMzFvdGszM2xhYjNycW00YW8ifQ.srmLkTlTXoMc9ZyXPNH-Tw";
let map: mapboxgl.Map | null = null;

export default {
  mounted() {
    map = new mapboxgl.Map({
      container: this.$refs.mapContainer,
      style: "mapbox://styles/mapbox/standard",
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

    map.addControl(geoControl);

    setTimeout(() => {
      console.log("Triggering geolocation");
      geoControl.trigger();
    }, 1000);

    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            label: "boat and human",
            imageId: 1011,
            iconSize: [50, 50],
          },
          geometry: {
            type: "Point",
            coordinates: [20, 50],
          },
        },
        {
          type: "Feature",
          properties: {
            label: "lighthouse",
            imageId: 870,
            iconSize: [50, 50],
          },
          geometry: {
            type: "Point",
            coordinates: [19.9, 50.02],
          },
        },
        {
          type: "Feature",
          properties: {
            label: "dog",
            imageId: 837,
            iconSize: [50, 50],
          },
          geometry: {
            type: "Point",
            coordinates: [19.8, 50.03],
          },
        },
      ],
    };

    for (const marker of geojson.features) {
      const el = document.createElement("div");
      const width = marker.properties.iconSize[0];
      const height = marker.properties.iconSize[1];
      el.className = "marker";
      el.style.backgroundImage = `url(https://picsum.photos/id/${marker.properties.imageId}/${width}/${height})`;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.backgroundSize = "100%";
      el.style.borderRadius = "50%";
      el.style.border = "3px solid white";
      el.tabIndex = 0;
      el.ariaLabel = `Marker with image of the ${marker.properties.label}`;

      el.addEventListener("click", () => {
        window.alert(marker.properties.label);
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          window.alert(marker.properties.label);
        }
      });

      new mapboxgl.Marker(el).setLngLat(marker.geometry.coordinates).addTo(map);
    }
  },

  unmounted() {
    map?.remove();
    map = null;
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
