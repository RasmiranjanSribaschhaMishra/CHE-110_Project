from api.index import app

# Expose app for Vercel /api/calculate endpoint
if __name__ == '__main__':
    app.run(port=5000)
