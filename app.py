import sqlite3
from math import radians, sin, cos, sqrt, atan2
import json
import os
import logging
import pandas as pd
from flask import Flask, jsonify, render_template, request

# Set up logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__, template_folder='templates', static_folder='static')

# Define the absolute path to the CSV file
# This makes the app's location independent of the current working directory
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(APP_ROOT, 'restaurants.db')

logging.info(f"Looking for DB at: {DB_PATH}")

def haversine_py(lat1, lon1, lat2, lon2):
    """ Haversine function in python for sqlite """
    R = 6371.0 # Earth radius in kilometers
    
    # Handle potential None values
    if any(v is None for v in [lat1, lon1, lat2, lon2]):
        return float('inf')

    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(radians, [lat1, lon1, lat2, lon2])
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

def find_nearby_restaurants(user_lat, user_lon, radius_km=2):
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    # Register the haversine function for use in SQL
    conn.create_function("haversine", 4, haversine_py)
    conn.row_factory = sqlite3.Row # Make rows accessible by column name

    query = """
        SELECT *, haversine(?, ?, latitude, longitude) as distance_km
        FROM restaurants
        WHERE distance_km <= ?
        ORDER BY number_of_ratings_numeric DESC;
    """
    
    cursor = conn.cursor()
    cursor.execute(query, (user_lat, user_lon, radius_km))
    
    restaurants_list = [dict(row) for row in cursor.fetchall()]
    conn.close()

    if not restaurants_list:
        return {"restaurants": [], "popular_cuisines": [], "popular_best_sellers": []}

    # Since we have the list, we can use pandas for analysis, which is still convenient
    df = pd.DataFrame(restaurants_list)

    all_cuisines = [c.strip() for cuisines_str in df['cuisines'].dropna() for c in cuisines_str.split(',')]
    cuisine_counts = pd.Series(all_cuisines).value_counts()
    popular_cuisines = cuisine_counts.head(10).index.tolist()

    all_best_sellers = []
    for best_sellers_str in df['best_sellers'].dropna():
        if isinstance(best_sellers_str, str) and best_sellers_str.strip().startswith('['):
            try:
                all_best_sellers.extend([item['name'] for item in json.loads(best_sellers_str) if 'name' in item])
            except json.JSONDecodeError:
                continue
    
    best_seller_counts = pd.Series(all_best_sellers).value_counts()
    popular_best_sellers = best_seller_counts.head(10).index.tolist()

    return {
        "restaurants": restaurants_list,
        "popular_cuisines": popular_cuisines,
        "popular_best_sellers": popular_best_sellers
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/restaurants')
def get_restaurants():
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    
    logging.info(f"Received request for lat={lat}, lon={lon}")

    if lat is None or lon is None:
        logging.error("Latitude or longitude not provided.")
        return jsonify({"error": "Latitude and longitude are required."}), 400
        
    try:
        data = find_nearby_restaurants(lat, lon)
        return jsonify(data)
    except Exception as e:
        logging.exception("An error occurred while fetching restaurant data.")
        return jsonify({"error": "An internal server error occurred."}), 500

if __name__ == '__main__':
    app.run(debug=True) 