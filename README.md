# SiteSee

A web application that tracks user eye gaze while browsing websites and generates heatmaps of where users look.

## Features

- **Eye Tracking Calibration**: Thorough 16-point calibration system (5 clicks per point)
- **Website Viewer**: Browse any website while tracking eye gaze
- **Gaze Data Collection**: Continuously tracks and stores gaze data for heatmap generation
- **Public Proxy Integration**: Uses public CORS proxy services to embed websites (no server setup required)
- **Heatmap**: Analyzation tool to map how users interact with the website (in this app, where they are looking)

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Install client dependencies:**
```bash
cd client
npm install
```

### Running the Application

**No server setup required!** The app uses public proxy services by default.

1. **Start the client**:
```bash
cd client
npm install
npm run dev
```
The client will run on `http://localhost:5173` (or another port if 5173 is taken)

2. **Open your browser** and navigate to the client URL (usually `http://localhost:5173`)


## Usage

1. **Calibration**: When you first load the app, you'll be asked to calibrate. Click on 16 points, clicking each point 5 times while looking at it.

2. **Browse Websites**: After calibration, enter any website URL in the input box and click "Load Website". The website will be loaded through a public proxy service.

3. **Eye Tracking**: Your eye gaze is continuously tracked and stored. The green laser pointer (if enabled) shows where you're looking.

4. **Controls**: The control panel in the top-right can be dragged by clicking and dragging the header. You can toggle the laser pointer and recalibrate from there.

## Notes

- Some websites may still not work perfectly due to JavaScript origin checks or Content Security Policy restrictions
- Public proxy services may have rate limits or occasional downtime
- Complex JavaScript applications may have issues when loaded through proxies
- Gaze data is stored in memory and will be used for heatmap generation (feature to be implemented)

## Project Structure

```
.
├── client/          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Calibration.jsx    # Calibration component
│   │   │   ├── WebGazer.jsx       # Main eye tracking component
│   │   │   └── WebsiteViewer.jsx  # Website viewer with iframe
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## Development

- Client uses Vite for fast development
- Uses public CORS proxy services (AllOrigins, CORS Proxy, etc.)
- WebGazer.js library is loaded from CDN for eye tracking

# Citations

This project makes use of the **WebGazer library**, which provides its data collection methodology

Papoutsaki, A., Sangkloy, P., Laskey, J., Daskalova, N., Huang, J., & Hays, J.
WebGazer: Scalable Webcam Eye Tracking Using User Interactions.
Proceedings of the 25th International Joint Conference on Artificial Intelligence (IJCAI), 2016.

The project also uses **Heatmap.js** for the visualization of data.
Heatmap.js © Patrick Wied.
GitHub: https://github.com/pa7/heatmap.js
