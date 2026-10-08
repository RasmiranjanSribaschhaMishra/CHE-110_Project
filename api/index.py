from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin frontend requests

# Emission Factors (yearly kg CO2e approximations)
EMISSION_FACTORS = {
    "electricity_per_kwh": 0.4,
    "cooking_fuel_yearly": {"lpg": 600, "electricity": 0, "wood": 800},
    "car_per_km": {"petrol": 0.192, "diesel": 0.171, "hybrid": 0.105, "electric": 0.053},
    "public_transport_per_km": 0.04,
    "flight_short_haul": 250,
    "diet_yearly": {
        "meat_heavy": 4.5 * 365,
        "average": 3.3 * 365,
        "vegetarian": 2.0 * 365,
        "vegan": 1.5 * 365
    },
    "waste_yearly": {"never": 500, "sometimes": 300, "always": 100}
}

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "online",
        "service": "EcoTrack API",
        "description": "Carbon footprint calculation serverless API"
    })

@app.route('/calculate', methods=['POST', 'GET'])
@app.route('/api/calculate', methods=['POST', 'GET'])
def calculate():
    if request.method == 'GET':
        return jsonify({
            "status": "ready",
            "message": "EcoTrack /api/calculate is operational. Send a POST request with your calculation parameters."
        })

    data = request.get_json(silent=True) or {}
    
    # Extract data with safe float parsing and fallbacks
    try:
        elec_kwh = float(data.get('electricity', 0) or 0)
    except (ValueError, TypeError):
        elec_kwh = 0.0

    fuel_type = str(data.get('cooking_fuel', 'electricity')).lower()
    
    try:
        car_km = float(data.get('car_distance', 0) or 0)
    except (ValueError, TypeError):
        car_km = 0.0

    car_type = str(data.get('car_type', 'petrol')).lower()
    
    try:
        pub_km = float(data.get('public_transport', 0) or 0)
    except (ValueError, TypeError):
        pub_km = 0.0

    try:
        flights = float(data.get('flights', 0) or 0)
    except (ValueError, TypeError):
        flights = 0.0

    diet = str(data.get('diet', 'average')).lower()
    waste = str(data.get('recycling', 'sometimes')).lower()

    # Calculate emissions per category in kg CO2e
    energy_val = (elec_kwh * 12 * EMISSION_FACTORS["electricity_per_kwh"]) + EMISSION_FACTORS["cooking_fuel_yearly"].get(fuel_type, 0)
    transport_val = (car_km * 12 * EMISSION_FACTORS["car_per_km"].get(car_type, 0)) + \
                    (pub_km * 12 * EMISSION_FACTORS["public_transport_per_km"]) + \
                    (flights * EMISSION_FACTORS["flight_short_haul"])
    diet_val = EMISSION_FACTORS["diet_yearly"].get(diet, 1204.5)
    waste_val = EMISSION_FACTORS["waste_yearly"].get(waste, 300)

    total_kg = energy_val + transport_val + diet_val + waste_val
    
    return jsonify({
        "totalTons": round(total_kg / 1000, 2),
        "breakdown": {
            "energy": round(energy_val / 1000, 2),
            "transport": round(transport_val / 1000, 2),
            "diet": round(diet_val / 1000, 2),
            "waste": round(waste_val / 1000, 2)
        }
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)
