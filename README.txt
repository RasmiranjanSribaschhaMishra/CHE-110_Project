Prerequisites
Before running the application, ensure Python is installed on the system. The backend requires two libraries to handle the calculations and connect to the frontend.

Step 1: Open the Project

Extract/Unzip the project folder.

Open Visual Studio Code.

Go to File > Open Folder... and select the carbon calculator folder.

Step 2: Install Dependencies

In VS Code, open a new Integrated Terminal (Terminal > New Terminal).
(Note: Because you opened the folder in Step 1, the terminal is already in the correct directory!)

Run the following command to install the required libraries:
pip install flask flask-cors

Step 3: Start the Python Backend
The calculation logic is handled by a local server. This server must be active before interacting with the website.

In that same terminal, run:
python app.py

Wait until the terminal displays * Running on http://127.0.0.1:5000.
(Do not close this terminal window, as it keeps the backend alive.)

Step 4: Launch the Frontend Interface
With the backend running, you can now open the user interface.

Locate the index.html file in the VS Code file explorer.

Right-click index.html and select "Open with Live Server" (if installed), or simply double-click the file in your Windows explorer to open it in your web browser.

Step 5: Execute a Calculation

Navigate through the EcoTrack wizard, selecting your Energy, Transport, and Diet preferences.

Click Calculate Footprint.

The JavaScript will instantly connect to the running Python server, process the data, and render the results dashboard using Chart.js.
