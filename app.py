from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Allows your HTML to talk to this Python server

# Moved from script.js
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

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    
    # Extract data from request
    elec_kwh = float(data.get('electricity', 0))
    fuel_type = data.get('cooking_fuel', 'electricity')
    car_km = float(data.get('car_distance', 0))
    car_type = data.get('car_type', 'petrol')
    pub_km = float(data.get('public_transport', 0))
    flights = float(data.get('flights', 0))
    diet = data.get('diet', 'average')
    waste = data.get('recycling', 'sometimes')

    # Calculations logic shifted to Python
    energy_val = (elec_kwh * 12 * EMISSION_FACTORS["electricity_per_kwh"]) + EMISSION_FACTORS["cooking_fuel_yearly"].get(fuel_type, 0)
    transport_val = (car_km * 12 * EMISSION_FACTORS["car_per_km"].get(car_type, 0)) + \
                    (pub_km * 12 * EMISSION_FACTORS["public_transport_per_km"]) + \
                    (flights * EMISSION_FACTORS["flight_short_haul"])
    diet_val = EMISSION_FACTORS["diet_yearly"].get(diet, 1204)
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