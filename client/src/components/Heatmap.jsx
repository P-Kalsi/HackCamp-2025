import React, { useEffect, useRef } from 'react';
import './Heatmap.css';

function Heatmap({ gazeData, isVisible, onInstanceReady, isTrackingActive = true }) {
  const heatmapContainerRef = useRef(null);
  const heatmapInstanceRef = useRef(null);
  const dataPointsRef = useRef(new Map()); // Map to store time spent at each coordinate
  const totalTimeSpentRef = useRef(0); // Total time spent looking (in milliseconds)
  const lastGazeTimeRef = useRef(null); // Timestamp of last gaze update
  const lastPointKeyRef = useRef(null); // Key of the last point we were looking at
  const updateIntervalRef = useRef(null);

  // Initialize heatmap instance
  useEffect(() => {
    if (!heatmapContainerRef.current) return;

    // Wait for h337 to be available
    const checkLibrary = setInterval(() => {
      if (window.h337 && heatmapContainerRef.current) {
        clearInterval(checkLibrary);
        
        const container = heatmapContainerRef.current;
        
        // Ensure container is transparent
        container.style.backgroundColor = 'transparent';
        
        // Create heatmap instance with transparent background
        const heatmapInstance = window.h337.create({
          container: container,
          backgroundColor: 'transparent',
          radius: 50,
          maxOpacity: 0.8,
          minOpacity: 0,
          blur: 0.85,
          gradient: {
            '0': '#0000FF',
            '.2': '#0080FF',
            '.35': '#00FFFF',
            '.45': '#00FF80',
            '.55': '#80FF00',
            '.65': '#FFFF00',
            '.75': '#FFCC00',
            '.82': '#FF9900',
            '.88': '#FF6600',
            '.93': '#FF3300',
            '.97': '#FF0000',
            '1': '#CC0000'
          }
        });

        // Force canvas to be transparent
        const canvas = container.querySelector('canvas');
        if (canvas) {
          canvas.style.backgroundColor = 'transparent';
        }

        heatmapInstanceRef.current = heatmapInstance;
        
        // Pass instance to parent immediately
        if (onInstanceReady) {
          onInstanceReady(heatmapInstance);
        }
        
        console.log('Heatmap initialized');
      }
    }, 100);

    return () => {
      clearInterval(checkLibrary);
    };
  }, [onInstanceReady]);

  // Set container to full window size
  useEffect(() => {
    if (!heatmapContainerRef.current) return;

    const syncSize = () => {
      const container = heatmapContainerRef.current;
      if (container) {
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.left = '0px';
        container.style.top = '0px';
        
        if (heatmapInstanceRef.current) {
          heatmapInstanceRef.current.repaint();
        }
      }
    };

    syncSize();
    window.addEventListener('resize', syncSize);

    return () => {
      window.removeEventListener('resize', syncSize);
    };
  }, []);

  // Update heatmap when gaze data changes - track time spent at each point
  useEffect(() => {
    if (!gazeData || !isTrackingActive) return;
    
    // Don't require instance to be ready - we'll accumulate data anyway
    const container = heatmapContainerRef.current;
    if (!container) return;
    
    // Use absolute screen coordinates for full-window heatmap
    const absoluteX = gazeData.absoluteX ?? gazeData.x;
    const absoluteY = gazeData.absoluteY ?? gazeData.y;

    // Check if point is within window bounds
    if (
      absoluteX >= 0 && absoluteX <= window.innerWidth &&
      absoluteY >= 0 && absoluteY <= window.innerHeight
    ) {
      const currentTime = Date.now();
      
      // Calculate time delta since last gaze update
      let timeDelta = 0;
      if (lastGazeTimeRef.current !== null) {
        timeDelta = currentTime - lastGazeTimeRef.current;
        totalTimeSpentRef.current += timeDelta;
        
        // Add the time delta to the previous point we were looking at
        if (lastPointKeyRef.current !== null) {
          const previousPoint = dataPointsRef.current.get(lastPointKeyRef.current);
          if (previousPoint) {
            previousPoint.timeSpent += timeDelta;
          }
        }
      }
      lastGazeTimeRef.current = currentTime;

      // Use a grid key to accumulate nearby points
      const gridSize = 5;
      const gridX = Math.floor(absoluteX / gridSize) * gridSize;
      const gridY = Math.floor(absoluteY / gridSize) * gridSize;
      const key = `${gridX},${gridY}`;

      // Get or create data point
      let currentPoint = dataPointsRef.current.get(key);

      if (!currentPoint) {
        currentPoint = {
          x: gridX,
          y: gridY,
          timeSpent: 0,
          lastUpdate: currentTime
        };
        dataPointsRef.current.set(key, currentPoint);
      } else {
        currentPoint.lastUpdate = currentTime;
      }
      
      lastPointKeyRef.current = key;
    }
  }, [gazeData, isTrackingActive]);

  // Periodically update heatmap with percentage-based values
  useEffect(() => {
    const updateHeatmap = () => {
      if (!heatmapInstanceRef.current) return;

      const totalTime = totalTimeSpentRef.current;
      if (totalTime === 0) return;

      // Convert time spent at each point to percentage of total time
      const dataArray = [];
      for (const [key, point] of dataPointsRef.current.entries()) {
        // Calculate percentage: (time at this point / total time) * 100
        const percentage = (point.timeSpent / totalTime) * 100;
        
        // Only include points with meaningful time spent (> 0.1%)
        if (percentage > 0.1) {
          dataArray.push({
            x: point.x,
            y: point.y,
            value: percentage // Value is percentage of total time
          });
        }
      }

      if (dataArray.length > 0) {
        // Find the actual max and min values in the dataset
        const values = dataArray.map(p => p.value);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);

        // Set max to the actual maximum value found, min to 0
        // This ensures the hottest spot (highest percentage) gets the hottest color
        // and all other spots are scaled relative to it
        heatmapInstanceRef.current.setData({
          max: maxValue,
          min: 0,
          data: dataArray
        });
      } else {
        heatmapInstanceRef.current.setData({ max: 0, min: 0, data: [] });
      }
    };

    // Update heatmap every 100ms
    updateIntervalRef.current = setInterval(updateHeatmap, 100);
    
    // Also update immediately when instance becomes available
    const checkAndUpdate = setInterval(() => {
      if (heatmapInstanceRef.current) {
        updateHeatmap();
        clearInterval(checkAndUpdate);
      }
    }, 50);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      clearInterval(checkAndUpdate);
    };
  }, []);

  // Clear data function (exposed via ref if needed)
  const clearData = () => {
    dataPointsRef.current.clear();
    totalTimeSpentRef.current = 0;
    lastGazeTimeRef.current = null;
    lastPointKeyRef.current = null;
    if (heatmapInstanceRef.current) {
      heatmapInstanceRef.current.setData({ max: 0, min: 0, data: [] });
    }
  };

  // Expose clear function and instance
  useEffect(() => {
    if (onInstanceReady && heatmapInstanceRef.current) {
      // Attach clear function to instance
      heatmapInstanceRef.current.clearData = clearData;
      onInstanceReady(heatmapInstanceRef.current);
    }
  }, [onInstanceReady]);

  // Always render (even when invisible) so data collection continues
  return (
    <div className="heatmap-wrapper" style={{ visibility: isVisible ? 'visible' : 'hidden' }}>
      <div 
        ref={heatmapContainerRef} 
        className="heatmap-container"
      />
    </div>
  );
}

export default Heatmap;
