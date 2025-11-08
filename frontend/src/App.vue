<script setup lang="ts">
import "mapbox-gl/dist/mapbox-gl.css";
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
  <div ref="shareLocationButton" class="share-location-button">
    Share Location
  </div>
</template>

<script lang="ts">
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken =
  "pk.eyJ1Ijoia2FsdWNraTIzIiwiYSI6ImNqNHkxMnFzMzFvdGszM2xhYjNycW00YW8ifQ.srmLkTlTXoMc9ZyXPNH-Tw";

export default {
  mounted() {
    const map = new mapboxgl.Map({
      container: this.$refs.mapContainer,
      style: "mapbox://styles/mapbox/standard",
    });

    this.map = map;
  },

  unmounted() {
    this.map.remove();
    this.map = null;
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
