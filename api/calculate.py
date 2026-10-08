from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Comprehensive lifecycle emission factors (IPCC / DEFRA / CEA Standards in kg CO2e)
EMISSION_FACTORS = {
    "electricity_per_kwh": 0.72,  # Grid average (kg CO2e / kWh)
    "renewable_reduction": 0.85,  # 85% clean offset when using solar/renewables
    "cooking_fuel_yearly": {
        "lpg": 580.0,
        "electricity": 240.0,
        "wood": 880.0,
        "biogas": 80.0,
        "induction_solar": 30.0
    },
    "car_per_km": {
        "petrol": 0.192,
        "diesel": 0.171,
        "cng": 0.135,
        "hybrid": 0.095,
        "electric": 0.045
    },
    "two_wheeler_per_km": {
        "petrol": 0.065,
        "electric": 0.015,
        "none": 0.0
    },
    "public_transport_per_km": {
        "bus": 0.054,
        "metro_train": 0.028,
        "shared_auto": 0.040
    },
    "flight_short_haul": 180.0,  # kg CO2e per flight (<1500 km)
    "flight_long_haul": 650.0,   # kg CO2e per flight (>1500 km)
    "diet_yearly": {
        "meat_heavy": 3.3 * 365,       # ~1204 kg
        "average_omnivore": 2.5 * 365, # ~912 kg
        "pescatarian": 1.9 * 365,      # ~693 kg
        "vegetarian": 1.5 * 365,       # ~547 kg
        "vegan": 1.1 * 365             # ~401 kg
    },
    "food_waste_factor": {
        "high": 350.0,
        "moderate": 180.0,
        "minimal": 40.0
    },
    "shopping_lifestyle_yearly": {
        "frequent": 650.0,
        "moderate": 320.0,
        "minimalist": 110.0
    },
    "waste_management_yearly": {
        "never": 420.0,
        "sometimes": 220.0,
        "always_compost": 60.0
    }
}

# Country benchmark baselines (tons CO2e per capita / year)
BENCHMARKS = {
    "india": 2.1,
    "global_avg": 4.7,
    "china": 8.0,
    "eu_avg": 6.8,
    "usa": 14.9,
    "paris_target_2030": 2.0  # Paris Agreement 1.5°C threshold
}

def calculate_footprint(data):
    # Energy
    try:
        elec_kwh = float(data.get('electricity', 0) or 0)
    except (ValueError, TypeError):
        elec_kwh = 0.0

    fuel_type = str(data.get('cooking_fuel', 'electricity')).lower()
    solar_pct = min(100.0, max(0.0, float(data.get('solar_percentage', 0) or 0))) / 100.0
    
    # Net electricity accounting for solar adoption
    effective_elec_factor = EMISSION_FACTORS["electricity_per_kwh"] * (1.0 - (solar_pct * EMISSION_FACTORS["renewable_reduction"]))
    energy_val = (elec_kwh * 12 * effective_elec_factor) + EMISSION_FACTORS["cooking_fuel_yearly"].get(fuel_type, 240.0)

    # Transport
    try:
        car_km = float(data.get('car_distance', 0) or 0)
    except (ValueError, TypeError):
        car_km = 0.0

    car_type = str(data.get('car_type', 'petrol')).lower()
    
    try:
        bike_km = float(data.get('bike_distance', 0) or 0)
    except (ValueError, TypeError):
        bike_km = 0.0

    bike_type = str(data.get('bike_type', 'none')).lower()

    try:
        bus_km = float(data.get('bus_distance', 0) or 0)
    except (ValueError, TypeError):
        bus_km = 0.0

    try:
        metro_km = float(data.get('metro_distance', 0) or 0)
    except (ValueError, TypeError):
        metro_km = 0.0

    try:
        flights_short = float(data.get('flights_short', data.get('flights', 0)) or 0)
    except (ValueError, TypeError):
        flights_short = 0.0

    try:
        flights_long = float(data.get('flights_long', 0) or 0)
    except (ValueError, TypeError):
        flights_long = 0.0

    car_emissions = car_km * 12 * EMISSION_FACTORS["car_per_km"].get(car_type, 0.192)
    bike_emissions = bike_km * 12 * EMISSION_FACTORS["two_wheeler_per_km"].get(bike_type, 0.0)
    transit_emissions = (bus_km * 12 * EMISSION_FACTORS["public_transport_per_km"]["bus"]) + \
                        (metro_km * 12 * EMISSION_FACTORS["public_transport_per_km"]["metro_train"])
    flight_emissions = (flights_short * EMISSION_FACTORS["flight_short_haul"]) + (flights_long * EMISSION_FACTORS["flight_long_haul"])
    
    transport_val = car_emissions + bike_emissions + transit_emissions + flight_emissions

    # Food & Diet
    diet = str(data.get('diet', 'average_omnivore')).lower()
    if diet == 'average':
        diet = 'average_omnivore'
    food_waste = str(data.get('food_waste', 'moderate')).lower()
    diet_val = EMISSION_FACTORS["diet_yearly"].get(diet, 912.5) + EMISSION_FACTORS["food_waste_factor"].get(food_waste, 180.0)

    # Waste & Consumption
    recycling = str(data.get('recycling', 'sometimes')).lower()
    shopping = str(data.get('shopping_habit', 'moderate')).lower()
    waste_val = EMISSION_FACTORS["waste_management_yearly"].get(recycling, 220.0) + EMISSION_FACTORS["shopping_lifestyle_yearly"].get(shopping, 320.0)

    total_kg = energy_val + transport_val + diet_val + waste_val
    total_tons = round(total_kg / 1000.0, 2)

    # Tree offset calculation (avg mature tree absorbs ~22 kg CO2/year)
    trees_needed = int(round(total_kg / 22.0))

    # Eco Rating Grade (A+ to F)
    if total_tons <= 2.0:
        grade = "A+ (Climate Hero)"
        badge_class = "grade-aplus"
    elif total_tons <= 3.5:
        grade = "A (Eco Conscious)"
        badge_class = "grade-a"
    elif total_tons <= 5.0:
        grade = "B (Global Average)"
        badge_class = "grade-b"
    elif total_tons <= 8.0:
        grade = "C (Moderate Impact)"
        badge_class = "grade-c"
    else:
        grade = "D (High Footprint)"
        badge_class = "grade-d"

    # Targeted suggestions with estimated ton reduction
    action_plan = []
    if (energy_val / 1000.0) > 1.2:
        action_plan.append({
            "category": "Energy",
            "title": "Rooftop Solar & Efficient Appliances",
            "impact_tons": round((energy_val * 0.45) / 1000.0, 2),
            "difficulty": "Medium",
            "action": "Installing 2kW solar panels and upgrading to 5-star inverter appliances can cut your household energy emissions by up to 45%."
        })
    if (car_emissions / 1000.0) > 1.0:
        action_plan.append({
            "category": "Mobility",
            "title": "Electrify or Carpool Your Commute",
            "impact_tons": round((car_emissions * 0.6) / 1000.0, 2),
            "difficulty": "Easy",
            "action": "Switching to an EV or carpooling twice a week eliminates significant tailpipe exhaust emissions."
        })
    if (flight_emissions / 1000.0) > 0.8:
        action_plan.append({
            "category": "Aviation",
            "title": "High-Speed Rail & Direct Flights",
            "impact_tons": round((flight_emissions * 0.5) / 1000.0, 2),
            "difficulty": "Medium",
            "action": "Replacing domestic flights with electric train travel produces up to 85% fewer emissions per passenger-km."
        })
    if diet in ["meat_heavy", "average_omnivore"]:
        action_plan.append({
            "category": "Nutrition",
            "title": "Plant-Forward Diet Transition",
            "impact_tons": round(0.45, 2),
            "difficulty": "Easy",
            "action": "Incorporating 3 plant-based days weekly saves approximately 450 kg CO2e annually while reducing water consumption."
        })
    if recycling in ["never", "sometimes"] or food_waste == "high":
        action_plan.append({
            "category": "Circularity",
            "title": "Zero-Waste & Composting System",
            "impact_tons": round(0.28, 2),
            "difficulty": "Easy",
            "action": "Composting kitchen scraps and recycling plastics prevents methane generation in landfills."
        })

    return {
        "totalTons": total_tons,
        "totalKg": round(total_kg, 1),
        "grade": grade,
        "badgeClass": badge_class,
        "treesNeeded": trees_needed,
        "breakdown": {
            "energy": round(energy_val / 1000.0, 2),
            "transport": round(transport_val / 1000.0, 2),
            "diet": round(diet_val / 1000.0, 2),
            "waste": round(waste_val / 1000.0, 2)
        },
        "detailedBreakdown": {
            "electricityKg": round(elec_kwh * 12 * effective_elec_factor, 1),
            "cookingFuelKg": round(EMISSION_FACTORS["cooking_fuel_yearly"].get(fuel_type, 240.0), 1),
            "carKg": round(car_emissions, 1),
            "bikeKg": round(bike_emissions, 1),
            "publicTransitKg": round(transit_emissions, 1),
            "flightsKg": round(flight_emissions, 1),
            "dietKg": round(EMISSION_FACTORS["diet_yearly"].get(diet, 912.5), 1),
            "foodWasteKg": round(EMISSION_FACTORS["food_waste_factor"].get(food_waste, 180.0), 1),
            "lifestyleKg": round(EMISSION_FACTORS["shopping_lifestyle_yearly"].get(shopping, 320.0), 1),
            "wasteKg": round(EMISSION_FACTORS["waste_management_yearly"].get(recycling, 220.0), 1)
        },
        "benchmarks": BENCHMARKS,
        "actionPlan": action_plan
    }

@app.route('/', defaults={'path': ''}, methods=['GET', 'POST'])
@app.route('/<path:path>', methods=['GET', 'POST'])
def calculate(path):
    if request.method == 'GET':
        return jsonify({
            "status": "ready",
            "service": "EcoTrack Carbon Intelligence API",
            "version": "2.0.0",
            "benchmarks": BENCHMARKS,
            "message": "EcoTrack API is operational. Send a POST request to /api/calculate with input metrics."
        })
    
    data = request.get_json(silent=True) or {}
    result = calculate_footprint(data)
    return jsonify(result)

if __name__ == '__main__':
    print("EcoTrack Server running on http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
