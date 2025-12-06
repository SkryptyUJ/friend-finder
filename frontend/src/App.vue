<script setup lang="ts">
import 'mapbox-gl/dist/mapbox-gl.css';
</script>

<template>
    <div ref="mapContainer" class="map-container"></div>
</template>

<script lang="ts">
import map from './helpers/users_map';
import socket from './helpers/sockets';

export default {
    mounted() {
        map.init(this.$refs.mapContainer as HTMLElement);
    },

    unmounted() {
        map.destroy();
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
