from api.index import app

if __name__ == '__main__':
    print("Starting EcoTrack server locally on http://127.0.0.1:5000...")
    app.run(port=5000, debug=True)