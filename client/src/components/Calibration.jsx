import React, { useState, useEffect, useRef } from 'react';
import './Calibration.css';

// Feature flag - set to false to remove laser in production
const SHOW_LASER = true;

function Calibration({ onCalibrationComplete }) {
  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [clicksRemaining, setClicksRemaining] = useState(5);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [gazePosition, setGazePosition] = useState(null);
  const [showLaser, setShowLaser] = useState(SHOW_LASER);
  
  // Use refs to track current values for click handler
  const currentIndexRef = useRef(0);
  const clicksRemainingRef = useRef(5);

  // Generate 16 calibration points in a 4x4 grid, evenly spread across the screen
  useEffect(() => {
    if (!isCalibrating) return;

    const points = [];
    const rows = 4; // 4 rows
    const cols = 4; // 4 columns = 16 points total
    const padding = 100; // padding from edges in pixels

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Calculate even spacing: divide available space by (cols-1) and (rows-1)
    // This ensures points are evenly distributed from edge to edge
    const cellWidth = (width - padding * 2) / (cols - 1);
    const cellHeight = (height - padding * 2) / (rows - 1);

    // Generate 16 points in a 4x4 grid
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        points.push({
          x: padding + col * cellWidth,
          y: padding + row * cellHeight,
          id: row * cols + col,
        });
      }
    }

    setCalibrationPoints(points);
    setCurrentPointIndex(0);
    setClicksRemaining(5);
    // Update refs to match state
    currentIndexRef.current = 0;
    clicksRemainingRef.current = 5;
  }, [isCalibrating]);

  // Set up gaze tracking - always track, but only show laser if enabled
  useEffect(() => {
    if (!isCalibrating || !window.webgazer) return;

    const webgazer = window.webgazer;
    
    // Always set gaze listener to keep tracking active
    // Only update position state if laser is enabled (for rendering)
    webgazer.setGazeListener((data, time) => {
      if (data && data.x !== null && data.y !== null) {
        // Only update state if laser is enabled (to avoid unnecessary re-renders)
        if (showLaser) {
          setGazePosition({ x: data.x, y: data.y });
        } else {
          // Tracking continues, but we don't update visual state
          setGazePosition(null);
        }
      }
    });

    // Cleanup: clear gaze listener when component unmounts
    return () => {
      if (webgazer && webgazer.clearGazeListener) {
        webgazer.clearGazeListener();
      }
    };
  }, [isCalibrating, showLaser]);

  const startCalibration = async () => {
    setIsCalibrating(true);
    
    // Wait for webgazer to be available
    const waitForWebGazer = () => {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (window.webgazer) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    };

    await waitForWebGazer();
    
    if (window.webgazer) {
      // Clear any previous calibration data
      if (window.webgazer.clearData) {
        window.webgazer.clearData();
      }
      
      // Disable WebGazer's built-in prediction points (red dot)
      window.webgazer.showPredictionPoints(false);
      
      // Start webgazer - it will automatically record clicks for calibration
      window.webgazer.begin();
    }
  };

  const handlePointClick = (event, point) => {
    if (!isCalibrating) return;
    
    // Prevent default to ensure click is captured
    event.preventDefault();
    event.stopPropagation();

    // Get current values from refs (always up-to-date)
    const currentIndex = currentIndexRef.current;
    const currentClicks = clicksRemainingRef.current;

    // Guard: check if we're done with all points
    if (currentIndex >= calibrationPoints.length) {
      return;
    }

    const currentPoint = calibrationPoints[currentIndex];
    // Only process clicks on the current point
    if (point.id !== currentPoint.id) {
      return;
    }

    // Guard: don't process if we've already completed this point
    if (currentClicks <= 0) {
      return;
    }

    const newClicksRemaining = currentClicks - 1;
    
    // Update refs immediately
    clicksRemainingRef.current = newClicksRemaining;
    
    // Update state
    setClicksRemaining(newClicksRemaining);

    // If this was the last click for this point, move to next point
    if (newClicksRemaining === 0) {
      if (currentIndex < calibrationPoints.length - 1) {
        // Move to next point
        const nextIndex = currentIndex + 1;
        currentIndexRef.current = nextIndex;
        clicksRemainingRef.current = 5;
        setCurrentPointIndex(nextIndex);
        setClicksRemaining(5);
      } else {
        // This was the last point - calibration complete
        finishCalibration();
      }
    }
  };

  const finishCalibration = () => {
    setIsCalibrating(false);
    if (window.webgazer) {
      // Ensure data is saved across sessions (defaults to true if not specified)
      // This ensures calibration data persists for future sessions
      window.webgazer.saveDataAcrossSessions(true);
    }
    onCalibrationComplete();
  };

  const currentPoint = calibrationPoints[currentPointIndex];

  if (!isCalibrating) {
    return (
      <div className="calibration-container">
        <div className="calibration-intro">
          <h1>Eye Tracking Calibration</h1>
          <p>
            To ensure accurate eye tracking, we need to calibrate the system.
            You'll be asked to look at and click on {calibrationPoints.length || 16} points on the screen,
            clicking each point 5 times.
          </p>
          <p>Please make sure:</p>
          <ul>
            <li>You're in a well-lit room</li>
            <li>Your face is clearly visible to the camera</li>
            <li>You're sitting at a comfortable distance from the screen</li>
          </ul>
          <button onClick={startCalibration} className="start-calibration-btn">
            Start Calibration
          </button>
          {SHOW_LASER && (
            <div className="laser-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={showLaser}
                  onChange={(e) => setShowLaser(e.target.checked)}
                />
                Show laser pointer (for testing)
              </label>
            </div>
          )}
        </div>
        {showLaser && gazePosition && (
          <div
            className="laser-pointer"
            style={{
              left: `${gazePosition.x}px`,
              top: `${gazePosition.y}px`,
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="calibration-container">
      <div className="calibration-header">
        <h2>Calibration in Progress</h2>
        <p>
          Point {currentPointIndex + 1} of {calibrationPoints.length}
        </p>
        <p className="clicks-remaining">
          Clicks remaining: {clicksRemaining} / 5
        </p>
        <p className="instruction">
          Look at the red dot and click it {clicksRemaining} more time{clicksRemaining !== 1 ? 's' : ''}
        </p>
      </div>

      {currentPoint && (
        <div
          className="calibration-dot"
          style={{
            left: `${currentPoint.x}px`,
            top: `${currentPoint.y}px`,
          }}
          onClick={(e) => handlePointClick(e, currentPoint)}
        />
      )}

      {showLaser && gazePosition && (
        <div
          className="laser-pointer"
          style={{
            left: `${gazePosition.x}px`,
            top: `${gazePosition.y}px`,
          }}
        />
      )}

      <button
        onClick={finishCalibration}
        className="skip-calibration-btn"
      >
        Skip Calibration
      </button>
    </div>
  );
}

export default Calibration;

