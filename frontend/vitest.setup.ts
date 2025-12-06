import { afterEach, vi } from 'vitest';

vi.stubEnv('SOCKET_IO_URL', 'http://localhost:3000');

const geolocationStub = {
    watchPosition: vi.fn(),
};

// Provide a minimal geolocation implementation for tests.
Object.defineProperty(global.navigator, 'geolocation', {
    value: geolocationStub,
    configurable: true,
});

afterEach(() => {
    geolocationStub.watchPosition.mockClear();
});
