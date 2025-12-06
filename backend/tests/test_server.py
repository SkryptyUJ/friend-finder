import pytest
from backend.main import app, socketio, locations


@pytest.fixture
def client():
    app.config['TESTING'] = True
    locations.clear()
    return socketio.test_client(app, flask_test_client=app.test_client())


@pytest.fixture
def multiple_clients():
    app.config['TESTING'] = True
    locations.clear()
    clients = [
        socketio.test_client(app, flask_test_client=app.test_client()),
        socketio.test_client(app, flask_test_client=app.test_client()),
        socketio.test_client(app, flask_test_client=app.test_client())
    ]
    return clients


class TestConnection:

    def test_client_can_connect(self, client):
        assert client.is_connected()

    def test_connect_emits_connected_event(self, client):
        received = client.get_received()
        event_names = [msg['name'] for msg in received]
        assert 'connected' in event_names

    def test_connect_emits_init_state(self, client):
        received = client.get_received()
        init_state_msg = next((msg for msg in received if msg['name'] == 'init_state'), None)
        assert init_state_msg is not None
        assert 'args' in init_state_msg
        assert isinstance(init_state_msg['args'][0], dict)

    def test_connect_stores_user_in_locations(self, client):
        assert len(locations) == 1
        user_data = list(locations.values())[0]
        assert 'userId' in user_data
        assert 'latitude' in user_data
        assert 'longitude' in user_data
        assert user_data['latitude'] is None
        assert user_data['longitude'] is None


class TestLocationUpdate:
    def test_location_acquired_updates_location(self, client):
        user_id = list(locations.keys())[0]
        location_data = {
            'userId': user_id,
            'latitude': 52.2297,
            'longitude': 21.0122
        }

        client.emit('location_acquired', location_data)

        assert locations[user_id] == location_data

    def test_location_acquired_broadcasts_to_all_clients(self, multiple_clients, client):
        client1, client2, client3 = multiple_clients

        # Clear initial messages
        client1.get_received()
        client2.get_received()
        client3.get_received()

        user_id = list(locations.keys())[0]
        location_data = {
            'userId': user_id,
            'latitude': 40.7128,
            'longitude': -74.0060
        }

        client1.emit('location_acquired', location_data)

        for client in multiple_clients:
            received = client.get_received()
            location_updates = [msg for msg in received if msg['name'] == 'location_update']
            assert len(location_updates) > 0
            assert location_updates[0]['args'][0] == location_data

    def test_location_acquired_with_valid_coordinates(self, client):
        user_id = list(locations.keys())[0]

        test_cases = [
            {'userId': user_id, 'latitude': 0.0, 'longitude': 0.0},
            {'userId': user_id, 'latitude': 90.0, 'longitude': 180.0},
            {'userId': user_id, 'latitude': -90.0, 'longitude': -180.0},
            {'userId': user_id, 'latitude': 37.7749, 'longitude': -122.4194}
        ]

        for location_data in test_cases:
            client.emit('location_acquired', location_data)
            assert locations[user_id] == location_data

    def test_multiple_location_updates_same_user(self, client):
        user_id = list(locations.keys())[0]

        first_location = {
            'userId': user_id,
            'latitude': 51.5074,
            'longitude': -0.1278
        }
        client.emit('location_acquired', first_location)
        assert locations[user_id] == first_location

        second_location = {
            'userId': user_id,
            'latitude': 48.8566,
            'longitude': 2.3522
        }
        client.emit('location_acquired', second_location)
        assert locations[user_id] == second_location


class TestDisconnection:
    def test_disconnect_removes_user_from_locations(self, client):
        user_id = list(locations.keys())[0]
        assert user_id in locations

        client.disconnect()

        assert user_id not in locations

    def test_disconnect_broadcasts_user_disconnected(self, multiple_clients):
        client1, client2, client3 = multiple_clients

        # Clear initial messages
        client1.get_received()
        client2.get_received()
        client3.get_received()

        user_id = list(locations.keys())[0]
        client1.disconnect()

        for client in [client2, client3]:
            received = client.get_received()
            disconnect_events = [msg for msg in received if msg['name'] == 'user_disconnected']
            assert len(disconnect_events) > 0
            assert disconnect_events[0]['args'][0] == user_id

    def test_multiple_disconnects(self, multiple_clients):
        initial_count = len(locations)
        assert initial_count == 3

        multiple_clients[0].disconnect()
        assert len(locations) == 2

        multiple_clients[1].disconnect()
        assert len(locations) == 1

        multiple_clients[2].disconnect()
        assert len(locations) == 0


class TestMultiUserScenarios:
    def test_init_state_includes_all_connected_users(self, multiple_clients):
        assert len(locations) == 3

        new_client = socketio.test_client(app, flask_test_client=app.test_client())

        received = new_client.get_received()
        init_state_msg = next((msg for msg in received if msg['name'] == 'init_state'), None)
        assert init_state_msg is not None

        init_state_data = init_state_msg['args'][0]
        assert len(init_state_data) == 4

    def test_concurrent_location_updates(self, multiple_clients):
        user_ids = list(locations.keys())

        # Clear initial messages
        for client in multiple_clients:
            client.get_received()

        locations_data = [
            {'userId': user_ids[0], 'latitude': 40.7128, 'longitude': -74.0060},
            {'userId': user_ids[1], 'latitude': 34.0522, 'longitude': -118.2437},
            {'userId': user_ids[2], 'latitude': 41.8781, 'longitude': -87.6298}
        ]

        for i, client in enumerate(multiple_clients):
            client.emit('location_acquired', locations_data[i])

        for i, user_id in enumerate(user_ids):
            assert locations[user_id] == locations_data[i]

    def test_user_joins_after_others_updated_locations(self, multiple_clients):
        client1, client2, client3 = multiple_clients
        user_ids = list(locations.keys())

        location1 = {'userId': user_ids[0], 'latitude': 52.2297, 'longitude': 21.0122}
        location2 = {'userId': user_ids[1], 'latitude': 59.3293, 'longitude': 18.0686}

        client1.emit('location_acquired', location1)
        client2.emit('location_acquired', location2)

        new_client = socketio.test_client(app, flask_test_client=app.test_client())
        received = new_client.get_received()

        init_state_msg = next((msg for msg in received if msg['name'] == 'init_state'), None)
        assert init_state_msg is not None

        init_state_data = init_state_msg['args'][0]

        assert init_state_data[user_ids[0]] == location1
        assert init_state_data[user_ids[1]] == location2
