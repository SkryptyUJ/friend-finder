import { io } from 'socket.io-client';
import type { UserLocation } from '@/types/user.types';

const SOCKET_IO_URL = import.meta.env.SOCKET_IO_URL

const socket = io(SOCKET_IO_URL);

const id = () => {
    if (!socket.id) {
        throw new Error('Socket ID is not available');
    }

    return socket.id;
};

const onConnected = (callback: () => void) => 
    socket.on('connected', callback);
const onInitState = (callback: (initialUsers: UserLocation[]) => void) =>
    socket.on('init_state', callback);
const onUserLocationUpdate = (callback: (user: UserLocation) => void) =>
    socket.on('location_update', callback);
const onUserDisconnected = (callback: (userId: string) => void) =>
    socket.on('user_disconnected', callback);

const emitUserLocation = (location: UserLocation) => 
    socket.emit('location_update', location);

const disconnect = () => socket.disconnect();

export default {
    id,
    onConnected,
    onInitState,
    onUserLocationUpdate,
    onUserDisconnected,
    emitUserLocation,
    disconnect,
};
