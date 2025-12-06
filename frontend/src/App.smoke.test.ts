/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import App from './App.vue';

// Use hoisted objects so mocks are defined before Vitest hoists vi.mock
const mapMock = vi.hoisted(() => ({
    init: vi.fn(),
    destroy: vi.fn(),
    toggleStyle: vi.fn(() => 'satellite-v9'),
    getTileUrl: vi.fn((style: string) => `https://tiles.example/${style}`),
    searchAddress: vi.fn(async () => null),
    flyTo: vi.fn(),
}));

const socketMock = vi.hoisted(() => ({
    disconnect: vi.fn(),
}));

vi.mock('./helpers/users_map', () => ({ __esModule: true, default: mapMock }));
vi.mock('./helpers/sockets', () => ({ __esModule: true, default: socketMock }));

describe('App smoke', () => {
    let host: HTMLDivElement | null = null;
    let appInstance: ReturnType<typeof createApp> | null = null;

    beforeEach(() => {
        host = document.createElement('div');
        host.id = 'app';
        document.body.appendChild(host);
    });

    afterEach(() => {
        if (appInstance) {
            appInstance.unmount();
            appInstance = null;
        }

        if (host) {
            host.remove();
            host = null;
        }

        vi.clearAllMocks();
    });

    it('mounts and wires map lifecycle', async () => {
        appInstance = createApp(App);
        appInstance.mount('#app');
        await nextTick();

        expect(mapMock.init).toHaveBeenCalledTimes(1);
        const [container] = mapMock.init.mock.calls[0];
        expect(container).toBeInstanceOf(HTMLElement);

        appInstance.unmount();

        expect(mapMock.destroy).toHaveBeenCalledTimes(1);
        expect(socketMock.disconnect).toHaveBeenCalledTimes(1);
    });
});
