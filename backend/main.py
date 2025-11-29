import os

from flask import Flask, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")


@socketio.on('connect')
def test_connect():
    print(f'Client connected: {request.sid}')
    emit('connected')


@socketio.on('location_acquired')
def handle_json_message(json):
    print('received json: ' + str(json))
    emit('location_update', json, broadcast=True)


@socketio.on('disconnect')
def test_disconnect():
    print(f'Client {request.sid} disconnected')
    emit('user_disconnected', request.sid, broadcast=True)


if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
