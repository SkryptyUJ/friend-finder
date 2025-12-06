import os

from flask import Flask, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60)

locations = {}


@app.route('/health')
def health():
    return {'status': 'ok', 'connected_users': len(locations)}, 200


@socketio.on('connect')
def connect():
    print(f'Client connected: {request.sid}')
    locations[request.sid] = {'userId': request.sid, 'location': {'lat': None, 'lon': None}}
    emit('connected')
    emit('init_state', list(locations.values()))


@socketio.on('location_acquired')
def handle_json_message(user_location):
    print('received json: ' + str(user_location))
    locations[user_location['userId']] = user_location
    emit('location_update', user_location, broadcast=True)


@socketio.on('disconnect')
def disconnect():
    print(f'Client {request.sid} disconnected')
    del locations[request.sid]
    emit('user_disconnected', request.sid, broadcast=True)


if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
