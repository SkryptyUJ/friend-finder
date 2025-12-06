<script setup lang="ts">
import 'mapbox-gl/dist/mapbox-gl.css';
</script>

<template>
    <div ref="mapContainer" class="map-container"></div>
    <div class="map-style" @click="toggleStyle" ref="mapStyle">
        <p>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#fff" viewBox="0 0 256 256"><path d="M10.05,110.42l112,64a12,12,0,0,0,11.9,0l112-64a12,12,0,0,0,0-20.84l-112-64a12,12,0,0,0-11.9,0l-112,64a12,12,0,0,0,0,20.84Zm118-60.6L215.81,100,128,150.18,40.19,100Zm122.42,92.23A12,12,0,0,1,246,158.42l-112,64a12,12,0,0,1-11.9,0l-112-64A12,12,0,1,1,22,137.58l106,60.6,106-60.6A12,12,0,0,1,250.42,142.05Z"></path></svg>
            <span>{{ otherStyle }}</span>
        </p>
    </div>
</template>

<script lang="ts">
import map from './helpers/users_map';
import socket from './helpers/sockets';
import { ref } from 'vue';

const otherStyle = ref('Satellite');
let mapStyleRef: HTMLElement | null = null;

function toggleStyle() {
    const style = map.toggleStyle();
    otherStyle.value = style === 'satellite-v9' ? 'Streets' : 'Satellite';

    if (!mapStyleRef) return;

    const previewStyle = style === 'satellite-v9' ? 'outdoors-v12' : 'satellite-v9';
    mapStyleRef.style.backgroundImage = `url('${map.getTileUrl(previewStyle)}')`;
}

export default {
    mounted() {
        mapStyleRef = this.$refs.mapStyle as HTMLElement;
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

.map-style {
    position: fixed;
    bottom: 40px;
    left: 20px;
    background-color: rgba(0, 0, 0, 0.5);
    background-image: url('https://api.mapbox.com/v4/mapbox.satellite/12/2274/1389.jpg90?access_token=pk.eyJ1Ijoia2FsdWNraTIzIiwiYSI6ImNqNHkxMnFzMzFvdGszM2xhYjNycW00YW8ifQ.srmLkTlTXoMc9ZyXPNH-Tw');
    color: #fff;
    font-family: Arial, sans-serif;
    border: 2px solid #fff;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    width: 80px;
    height: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;

    svg {
        vertical-align: middle;
        margin-right: 4px;
        width: 14px;
    }

    p {
        font-size: 12.5px;
    }

    #styles {
        display: none;
        position: absolute;
        height: 80px;
        left: 70px;
        top: -2px;
        background-color: rgba(0, 0, 0, 0.01);
        padding-left: 20px;
    }

    #styles > div {
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
        background-color: #fff;
        border-radius: 5px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
}

.map-style:hover #styles {
    display: flex;
}
</style>
