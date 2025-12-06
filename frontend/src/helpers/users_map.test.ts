/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks are defined before importing the modules under test.
// Use vi.hoisted so the object exists before hoisted vi.mock factories run.
const socketCallbacks = vi.hoisted(() => ({
    connected: [] as Array<() => void>,
    initState: [] as Array<(payload: unknown) => void>,
    userUpdate: [] as Array<(payload: unknown) => void>,
    userDisconnected: [] as Array<(payload: unknown) => void>,
}));

type MockMapStyle = string;

type MockFlyToArgs = {
    center: unknown;
    zoom: number;
    duration: number;
};

vi.mock('mapbox-gl', () => {
    let lastMapInstance: MockMap | undefined;

    class MockMap {
        public styleUrl: MockMapStyle;
        public container: HTMLElement;
        public geolocateControl: MockGeolocateControl | null = null;
        public flyTo = vi.fn((options: MockFlyToArgs) => {
            this.lastFlyToArgs = options;
        });
        public setStyle = vi.fn((url: MockMapStyle) => {
            this.styleUrl = url;
        });
        public getStyle = vi.fn(() => ({ sprite: this.styleUrl }));
        public addControl = vi.fn((control: MockGeolocateControl) => {
            this.geolocateControl = control;
        });
        public remove = vi.fn();
        public lastFlyToArgs: MockFlyToArgs | null = null;

        constructor(options: { container: HTMLElement; style: MockMapStyle }) {
            this.container = options.container;
            this.styleUrl = options.style;
            lastMapInstance = this;
        }
    }

    class MockMarker {
        public location: unknown;
        public mapRef: MockMap | null = null;
        public setLngLat = vi.fn((location: unknown) => {
            this.location = location;
            return this;
        });
        public addTo = vi.fn((map: MockMap) => {
            this.mapRef = map;
            return this;
        });
        public remove = vi.fn();

        constructor(public element: HTMLElement) {}
    }

    class MockGeolocateControl {
        public trigger = vi.fn();
        constructor(public options: unknown) {}
    }

    const mapboxglMock = {
        Map: MockMap,
        Marker: MockMarker,
        GeolocateControl: MockGeolocateControl,
        accessToken: '',
        __getLastMapInstance: () => lastMapInstance,
    };

    return { __esModule: true, default: mapboxglMock };
});

vi.mock('./sockets', () => {
    const socketMock = {
        id: vi.fn(() => 'socket-id'),
        onConnected: vi.fn((callback: () => void) => {
            socketCallbacks.connected.push(callback);
            return socketMock;
        }),
        onInitState: vi.fn((callback: (payload: unknown) => void) => {
            socketCallbacks.initState.push(callback);
            return socketMock;
        }),
        onUserLocationUpdate: vi.fn((callback: (payload: unknown) => void) => {
            socketCallbacks.userUpdate.push(callback);
            return socketMock;
        }),
        onUserDisconnected: vi.fn((callback: (payload: unknown) => void) => {
            socketCallbacks.userDisconnected.push(callback);
            return socketMock;
        }),
        emitUserLocation: vi.fn(),
        disconnect: vi.fn(),
        __callbacks: socketCallbacks,
    };

    return { __esModule: true, default: socketMock };
});

import mapboxgl from 'mapbox-gl';
import socket from './sockets';
import map from './users_map';

// jsdom shim for document in non-DOM environments
if (typeof document === 'undefined') {
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const win = dom.window as unknown as Window;
    // @ts-expect-error: test-only global assignment
    globalThis.window = win;
    // @ts-expect-error: test-only global assignment
    globalThis.document = win.document;
    // Redefine navigator to allow assignment when property is read-only
    Object.defineProperty(globalThis, 'navigator', {
        value: win.navigator,
        writable: true,
        configurable: true,
    });
}

// Ensure geolocation exists for tests that trigger it.
if (!navigator.geolocation) {
    const geolocationMock = {
        watchPosition: vi.fn(),
    } as unknown as Geolocation;

    Object.defineProperty(navigator, 'geolocation', {
        value: geolocationMock,
        writable: true,
        configurable: true,
    });
}

const getMapInstance = () =>
    (mapboxgl as unknown as { __getLastMapInstance: () => unknown }).__getLastMapInstance();

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    map.destroy();
    vi.useRealTimers();
    vi.clearAllMocks();
    socketCallbacks.connected.length = 0;
    socketCallbacks.initState.length = 0;
    socketCallbacks.userUpdate.length = 0;
    socketCallbacks.userDisconnected.length = 0;
});

describe('users_map helper', () => {
    it('throws when toggling style before initialization', () => {
        expect(() => map.toggleStyle()).toThrow('Map is not initialized');
    });

    it('toggles map style between satellite and standard', () => {
        const container = document.createElement('div');
        map.init(container);

        const firstStyle = map.toggleStyle();
        const mapInstance = getMapInstance() as { styleUrl: string };

        expect(firstStyle).toBe('satellite-v9');
        expect(mapInstance.styleUrl).toBe('mapbox://styles/mapbox/satellite-v9');

        const secondStyle = map.toggleStyle();
        expect(secondStyle).toBe('standard');
        expect(mapInstance.styleUrl).toBe('mapbox://styles/mapbox/standard');
    });

    it('delegates flyTo to the map instance', () => {
        const container = document.createElement('div');
        map.init(container);
        const mapInstance = getMapInstance() as { flyTo: ReturnType<typeof vi.fn> };

        map.flyTo([1, 2]);

        expect(mapInstance.flyTo).toHaveBeenCalledWith({
            center: [1, 2],
            zoom: 14,
            duration: 1000,
        });
    });

    it('searchAddress parses coordinates from the API and handles empty results', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({ json: async () => [{ lat: '50.06', lon: '19.94' }] })
            .mockResolvedValueOnce({ json: async () => [] });

        vi.stubGlobal('fetch', fetchMock);

        const result = await map.searchAddress('Krakow');
        expect(fetchMock).toHaveBeenCalledWith(
            'https://nominatim.openstreetmap.org/search?q=Krakow&limit=1&format=jsonv2',
        );
        expect(result).toEqual({ lat: 50.06, lon: 19.94 });

        const empty = await map.searchAddress('Nowhere');
        expect(empty).toBeNull();

        vi.unstubAllGlobals();
    });

    it('registers socket listeners and triggers geolocation after init', () => {
        const container = document.createElement('div');
        map.init(container);

        expect(socket.onConnected).toHaveBeenCalledTimes(1);
        expect(socket.onInitState).toHaveBeenCalledTimes(1);
        expect(socket.onUserLocationUpdate).toHaveBeenCalledTimes(1);
        expect(socket.onUserDisconnected).toHaveBeenCalledTimes(1);

        const mapInstance = getMapInstance() as {
            geolocateControl: { trigger: ReturnType<typeof vi.fn> };
        };

        vi.runAllTimers();
        expect(mapInstance.geolocateControl.trigger).toHaveBeenCalled();

        // Simulate socket connection to ensure geolocation watch is requested.
        const connectedCb = socketCallbacks.connected[0];
        connectedCb?.();
        expect(navigator.geolocation.watchPosition).toHaveBeenCalledTimes(1);
    });
});
