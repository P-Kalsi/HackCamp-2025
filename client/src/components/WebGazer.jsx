import React, { useState, useEffect, useRef } from 'react';
import Calibration from './Calibration';
import WebsiteViewer from './WebsiteViewer';
import AIInsights from './AIInsights';
import './WebGazer.css';

// Feature flag - set to false to remove laser in production
const SHOW_LASER = true;

function WebGazer() {
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [gazePosition, setGazePosition] = useState(null);
  const [showLaser, setShowLaser] = useState(false); // Start with laser off
  const [isTrackingActive, setIsTrackingActive] = useState(false); // Track if tracking is active
  const [showHeatmap, setShowHeatmap] = useState(false); // Show heatmap view with insights
  const webgazerRef = useRef(null);
  const gazeDataRef = useRef([]); // Store gaze data for heatmap
  const [panelPosition, setPanelPosition] = useState({ x: null, y: null }); // null = use default CSS positioning
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);

  useEffect(() => {
    // Wait for webgazer to load
    const checkWebGazer = setInterval(() => {
      if (window.webgazer) {
        clearInterval(checkWebGazer);
        webgazerRef.current = window.webgazer;
      }
    }, 100);

    return () => {
      clearInterval(checkWebGazer);
    };
  }, []);

  useEffect(() => {
    if (!isCalibrated || !webgazerRef.current) {
      return;
    }

    const webgazer = webgazerRef.current;
    
    // Disable WebGazer's built-in prediction points (red dot)
    webgazer.showPredictionPoints(false);
    
    // Always set gaze listener to keep tracking active
    // Track gaze data continuously for heatmap generation
    webgazer.setGazeListener((data, time) => {
      if (data && data.x !== null && data.y !== null) {
        // Always update gaze position (needed for WebsiteViewer tracking)
        // Only update if tracking is active
        if (isTrackingActive) {
          setGazePosition({ x: data.x, y: data.y });
        } else {
          // Clear gaze position when tracking is inactive
          setGazePosition(null);
        }
        
        // Store gaze data for heatmap (even if laser is off)
        // This will be processed by WebsiteViewer component
      }
    });

    // Cleanup function
    return () => {
      if (webgazer && webgazer.clearGazeListener) {
        webgazer.clearGazeListener();
      }
    };
  }, [isCalibrated, isTrackingActive]);

  // Handle tracking state changes from WebsiteViewer
  const handleTrackingStateChange = (isActive) => {
    setIsTrackingActive(isActive);
    setShowLaser(isActive && SHOW_LASER); // Turn laser on/off based on tracking state
  };

  const handleCalibrationComplete = () => {
    setIsCalibrated(true);
    // Clear any previous gaze data
    gazeDataRef.current = [];
    // WebGazer is already running from begin() in Calibration component
    // No need to call resume() since we never paused it
    // The gaze listener will be set up in the useEffect above
  };

  // Draggable panel handlers
  const handleMouseDown = (e) => {
    // Only start dragging if clicking on the header
    const header = e.target.closest('.control-panel-header');
    if (!header) {
      return;
    }
    
    // Don't drag if clicking on buttons or inputs
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('label')) {
      return;
    }
    
    setIsDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep panel within viewport bounds
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 200);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 150);
      
      setPanelPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isCalibrated) {
    return <Calibration onCalibrationComplete={handleCalibrationComplete} />;
  }

  // Handle gaze data from WebsiteViewer (for heatmap)
  const handleGazeData = (gazeDataPoint) => {
    // Store gaze data for heatmap generation
    gazeDataRef.current.push(gazeDataPoint);
    
    // Limit stored data to prevent memory issues (keep last 50000 points)
    if (gazeDataRef.current.length > 50000) {
      gazeDataRef.current = gazeDataRef.current.slice(-50000);
    }
    
    // You can access all gaze data via gazeDataRef.current for heatmap generation
    // console.log('Gaze data points:', gazeDataRef.current.length);
  };

  // Convert gaze data to heatmap format for AIInsights
  const heatmapData = gazeDataRef.current.map(point => ({
    x: point.absoluteX || point.x,
    y: point.absoluteY || point.y,
    value: 1
  }));

  return (
    <div className="webgazer-container">
      <WebsiteViewer
        gazePosition={gazePosition}
        showLaser={showLaser && isTrackingActive}
        onGazeData={handleGazeData}
        onTrackingStateChange={handleTrackingStateChange}
      />
      
      {/* AI Insights - shown when viewing heatmap */}
      {showHeatmap && (
        <AIInsights 
          heatmapData={heatmapData} 
          isVisible={showHeatmap} 
        />
      )}
      
      {/* Control panel overlay - draggable */}
      <div 
        ref={panelRef}
        className={`control-panel ${isDragging ? 'dragging' : ''}`}
        style={{
          left: panelPosition.x !== null ? `${panelPosition.x}px` : 'auto',
          top: panelPosition.y !== null ? `${panelPosition.y}px` : 'auto',
          right: (panelPosition.x === null && panelPosition.y === null) ? '1rem' : 'auto',
          bottom: (panelPosition.x === null && panelPosition.y === null) ? 'auto' : 'auto',
        }}
      >
        <div className="control-panel-header" onMouseDown={handleMouseDown}>
          <span className="drag-handle">⋮⋮</span>
          <span className="panel-title">Controls</span>
        </div>
        <div className="control-panel-content">
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
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className="recalibrate-btn"
            style={{ marginBottom: '0.5rem' }}
          >
            {showHeatmap ? 'Hide Heatmap' : 'View Heatmap'}
          </button>
          <button
            onClick={() => {
              // Clear gaze listener before recalibrating
              if (webgazerRef.current && webgazerRef.current.clearGazeListener) {
                webgazerRef.current.clearGazeListener();
              }
              setGazePosition(null);
              gazeDataRef.current = []; // Clear stored gaze data
              setShowHeatmap(false); // Hide heatmap when recalibrating
              setIsCalibrated(false);
            }}
            className="recalibrate-btn"
          >
            Recalibrate
          </button>
        </div>
      </div>
    </div>
  );
}

export default WebGazer;
