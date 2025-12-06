/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('socket.io-client', () => {
    const mockSocket = {
        id: 'socket-123',
        on: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
    };

    const io = vi.fn(() => mockSocket);

    return { __esModule: true, io, __mockSocket: mockSocket };
});

// @ts-expect-error: test-only mock export
import { __mockSocket as mockSocket } from 'socket.io-client';
import socketHelper from './sockets';

describe('sockets helper', () => {
    beforeEach(() => {
        mockSocket.id = 'socket-123';
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns the socket id when available', () => {
        expect(socketHelper.id()).toBe('socket-123');
    });

    it('throws when socket id is missing', () => {
        mockSocket.id = undefined as unknown as string;
        expect(() => socketHelper.id()).toThrow('Socket ID is not available');
    });

    it('registers listeners for socket events', () => {
        const connected = vi.fn();
        const init = vi.fn();
        const update = vi.fn();
        const disconnected = vi.fn();

        socketHelper.onConnected(connected);
        socketHelper.onInitState(init);
        socketHelper.onUserLocationUpdate(update);
        socketHelper.onUserDisconnected(disconnected);

        expect(mockSocket.on).toHaveBeenCalledWith('connected', connected);
        expect(mockSocket.on).toHaveBeenCalledWith('init_state', init);
        expect(mockSocket.on).toHaveBeenCalledWith('location_update', update);
        expect(mockSocket.on).toHaveBeenCalledWith('user_disconnected', disconnected);
    });

    it('emits location updates and disconnects', () => {
        const payload = { userId: 'user-1', location: { lat: 1, lon: 2 } };

        socketHelper.emitUserLocation(payload as never);
        expect(mockSocket.emit).toHaveBeenCalledWith('location_update', payload);

        socketHelper.disconnect();
        expect(mockSocket.disconnect).toHaveBeenCalled();
    });
});
