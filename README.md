# 🌱 EcoTrack — Personal Carbon Footprint Calculator

EcoTrack is a full-stack Personal Carbon Footprint Calculator. Built with a responsive HTML/CSS/JS frontend and a Python Flask backend, it estimates yearly CO2e emissions across energy, transport, diet, and waste. Features interactive data visualization via Chart.js and actionable sustainability tips. Developed for a B.Tech CSE academic project (CHE-110).

---

## 🚀 Live Demo & Deployment

This project is configured for **1-click zero-config deployment on Vercel** with Python serverless functions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRasmiranjanSribaschhaMishra%2FCHE-110_Project)

---

## 🛠️ Features

- ⚡ **Multi-Step Wizard UI:** Intuitive step-by-step form for Household Energy, Transportation, and Diet & Waste.
- 🐍 **Python Flask Serverless Backend:** Serverless API endpoint (`/api/calculate`) deployed with `@vercel/python`.
- 📊 **Dynamic Data Visualizations:** Interactive Chart.js doughnut chart breakdown and benchmark comparisons against global and high-income averages.
- 💡 **Actionable Personalized Tips:** Tailored suggestions generated based on your top carbon footprint contributors.
- 📱 **Mobile & Desktop Responsive:** Modern glassmorphism UI with clean typography and smooth transitions.
- 💾 **Local State Persistence:** Stores calculation history in `localStorage` for instant review.

---

## 📁 Project Structure

```
CHE-110_Project/
├── api/
│   └── index.py        # Python Flask Serverless function for Vercel
├── index.html          # Frontend single page application
├── style.css           # Styling with CSS custom properties & animations
├── script.js           # Frontend logic, wizard controller & Chart.js integration
├── app.py              # Local Python server launcher
├── requirements.txt    # Python dependencies (Flask, flask-cors)
├── vercel.json         # Vercel routing configuration
└── README.md           # Project documentation
```

---

## 💻 Running Locally

### Prerequisites
- Python 3.9+
- Modern Web Browser

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Start the Python Backend
```bash
python app.py
```
*The server will start at `http://127.0.0.1:5000`.*

### Step 3: Open the Frontend
Open `index.html` in your browser or run with Live Server.

---

## ☁️ Deploying to Vercel

### Option 1: Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New Project"** > **"Import Git Repository"**.
3. Select `CHE-110_Project`.
4. Leave framework preset as **Other** (Vercel automatically detects `vercel.json` and `api/index.py`).
5. Click **Deploy**.

### Option 2: Vercel CLI
```bash
vercel
```
For production:
```bash
vercel --prod
```

---

## 👥 Author

- **Rasmiranjan Sribaschha Mishra**
- Academic Project for CHE-110 (Environmental Studies / Engineering Chemistry)
