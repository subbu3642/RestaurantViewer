# Hyderabad Restaurant Finder

A web app to find restaurants within a 2km radius in Hyderabad, using Flask, SQLite, and Leaflet.js.

## Features

- Interactive map to select location
- Shows nearby restaurants, popular cuisines, and best-sellers
- Filter by cuisine
- View restaurant details

## Requirements

- Python 3.7+
- pip (Python package manager)

## Setup Instructions

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```

2. **(Optional) Create a virtual environment:**
   ```sh
   python -m venv venv
   # On Windows:
   venv\\Scripts\\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```sh
   pip install -r requirements.txt
   ```

4. **Ensure the database file is present:**
   - The file `restaurants.db` should be in the project root. If not, add or generate it as needed.

5. **Run the app:**
   ```sh
   python app.py
   ```

6. **Open in your browser:**
   - Go to [http://127.0.0.1:5000/](http://127.0.0.1:5000/)

## Project Structure
## Notes

- The app uses Leaflet.js and leaflet-geosearch via CDN, so no extra JS installation is needed.
- If you want to use your own restaurant data, replace or update `restaurants.db`.

## License

[MIT](LICENSE) 
