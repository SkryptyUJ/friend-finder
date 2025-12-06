<script setup lang="ts">
import 'mapbox-gl/dist/mapbox-gl.css';
</script>

<template>
    <div class="search-bar">
        <input type="text" placeholder="Search for a location..." @keydown.enter="searchLocation"
            v-model="searchQuery" />
        <svg @click="searchLocation" xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#5e5e5e"
            viewBox="0 0 256 256">
            <path
                d="M232.49,215.51,185,168a92.12,92.12,0,1,0-17,17l47.53,47.54a12,12,0,0,0,17-17ZM44,112a68,68,0,1,1,68,68A68.07,68.07,0,0,1,44,112Z">
            </path>
        </svg>
    </div>
    <div ref="mapContainer" class="map-container"></div>
    <div class="map-style" @click="toggleStyle" ref="mapStyle">
        <p>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#fff" viewBox="0 0 256 256">
                <path
                    d="M10.05,110.42l112,64a12,12,0,0,0,11.9,0l112-64a12,12,0,0,0,0-20.84l-112-64a12,12,0,0,0-11.9,0l-112,64a12,12,0,0,0,0,20.84Zm118-60.6L215.81,100,128,150.18,40.19,100Zm122.42,92.23A12,12,0,0,1,246,158.42l-112,64a12,12,0,0,1-11.9,0l-112-64A12,12,0,1,1,22,137.58l106,60.6,106-60.6A12,12,0,0,1,250.42,142.05Z">
                </path>
            </svg>
            <span>{{ otherStyle }}</span>
        </p>
    </div>
</template>

<script lang="ts">
import map from './helpers/users_map';
import socket from './helpers/sockets';
import { ref } from 'vue';

const otherStyle = ref('Satellite');
const searchQuery = ref('');
let mapStyleRef: HTMLElement | null = null;

function toggleStyle() {
    const style = map.toggleStyle();
    otherStyle.value = style === 'satellite-v9' ? 'Streets' : 'Satellite';

    if (!mapStyleRef) return;

    const previewStyle = style === 'satellite-v9' ? 'outdoors-v12' : 'satellite-v9';
    mapStyleRef.style.backgroundImage = `url('${map.getTileUrl(previewStyle)}')`;
}

async function searchLocation() {
    if (searchQuery.value.trim() === '') return;

    try {
        const result = await map.searchAddress(searchQuery.value.trim());
        console.log('Search result:', result);
        if (result) {
            map.flyTo([result.lon, result.lat]);
        }
    } catch (error) {
        console.error('Error searching location:', error);
    }
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
    bottom: 16px;
    left: 16px;
    background-color: rgba(0, 0, 0, 0.5);
    background-image: url('https://api.mapbox.com/v4/mapbox.satellite/12/2274/1389.jpg90?access_token=pk.eyJ1Ijoia2FsdWNraTIzIiwiYSI6ImNqNHkxMnFzMzFvdGszM2xhYjNycW00YW8ifQ.srmLkTlTXoMc9ZyXPNH-Tw');
    color: #fff;
    font-family: Arial, sans-serif;
    border: 2px solid #fff;
    border-radius: 10px;
    box-shadow: 0 0 12px rgba(0, 0, 0, 0.2);
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

    #styles>div {
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

.search-bar {
    position: fixed;
    top: 16px;
    left: 16px;
    background-color: #fff;
    border-radius: 30px;
    box-shadow: 0 0 12px rgba(0, 0, 0, 0.2);
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 1;

    input {
        border: none;
        outline: none;
        font-size: 15px;
        border-radius: 30px;
        padding: 4px 8px;
        width: 250px;

        &::placeholder {
            color: #999;
        }
    }

    svg {
        cursor: pointer;
        width: 18px;
        height: 18px;
    }
}
</style>
