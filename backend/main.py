from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route("/healthz", methods=["GET"])
def healthz():
    return jsonify(status="ok"), 200

if __name__ == "__main__":
    port = int(os.getenv("PORT"))
    app.run(host="0.0.0.0", port=5000)
