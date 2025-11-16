import React, { useState, useEffect } from 'react';

const AIInsights = ({ heatmapData, isVisible }) => {
  const [insights, setInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  // Analyze heatmap data to generate insights
  useEffect(() => {
    if (isVisible && heatmapData && heatmapData.length > 0) {
      // Reset insights when data changes to trigger re-analysis
      setInsights(null);
      analyzeHeatmapData(heatmapData);
    } else if (isVisible && (!heatmapData || heatmapData.length === 0)) {
      // Clear insights if no data
      setInsights(null);
    }
  }, [isVisible, heatmapData]);

  const analyzeHeatmapData = async (data) => {
    setIsAnalyzing(true);
    
    try {
      // Perform comprehensive local analysis
      const analysis = performLocalAnalysis(data);
      setInsights(analysis);
    } catch (error) {
      console.error('Error analyzing data:', error);
      const localAnalysis = performLocalAnalysis(data);
      localAnalysis.error = `Analysis error: ${error.message}`;
      setInsights(localAnalysis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performLocalAnalysis = (data) => {
    if (!data || data.length === 0) return null;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const totalPoints = data.length;
    
    // Divide screen into 9 regions (3x3 grid) for more detailed analysis
    const regionWidth = screenWidth / 3;
    const regionHeight = screenHeight / 3;
    
    const regions = {
      topLeft: { x: [0, regionWidth], y: [0, regionHeight], count: 0, percentage: 0 },
      topCenter: { x: [regionWidth, regionWidth * 2], y: [0, regionHeight], count: 0, percentage: 0 },
      topRight: { x: [regionWidth * 2, screenWidth], y: [0, regionHeight], count: 0, percentage: 0 },
      middleLeft: { x: [0, regionWidth], y: [regionHeight, regionHeight * 2], count: 0, percentage: 0 },
      middleCenter: { x: [regionWidth, regionWidth * 2], y: [regionHeight, regionHeight * 2], count: 0, percentage: 0 },
      middleRight: { x: [regionWidth * 2, screenWidth], y: [regionHeight, regionHeight * 2], count: 0, percentage: 0 },
      bottomLeft: { x: [0, regionWidth], y: [regionHeight * 2, screenHeight], count: 0, percentage: 0 },
      bottomCenter: { x: [regionWidth, regionWidth * 2], y: [regionHeight * 2, screenHeight], count: 0, percentage: 0 },
      bottomRight: { x: [regionWidth * 2, screenWidth], y: [regionHeight * 2, screenHeight], count: 0, percentage: 0 }
    };

    // Count points in each region
    data.forEach(point => {
      Object.keys(regions).forEach(regionKey => {
        const region = regions[regionKey];
        if (point.x >= region.x[0] && point.x < region.x[1] &&
            point.y >= region.y[0] && point.y < region.y[1]) {
          region.count++;
        }
      });
    });

    // Calculate percentages for each region
    Object.keys(regions).forEach(key => {
      regions[key].percentage = Math.round((regions[key].count / totalPoints) * 100);
    });

    // Find hottest and coldest regions
    const regionEntries = Object.entries(regions);
    const hottestRegion = regionEntries.reduce((max, [key, region]) => 
      region.count > max.count ? { key, ...region } : max
    , { key: 'middleCenter', count: 0 });
    
    const coldestRegion = regionEntries.reduce((min, [key, region]) => 
      region.count < min.count ? { key, ...region } : min
    , { key: 'middleCenter', count: Infinity });

    // Calculate quadrant percentages
    const topLeftQuad = regions.topLeft.count + regions.topCenter.count + regions.middleLeft.count + regions.middleCenter.count;
    const topRightQuad = regions.topRight.count + regions.topCenter.count + regions.middleRight.count + regions.middleCenter.count;
    const bottomLeftQuad = regions.bottomLeft.count + regions.bottomCenter.count + regions.middleLeft.count + regions.middleCenter.count;
    const bottomRightQuad = regions.bottomRight.count + regions.bottomCenter.count + regions.middleRight.count + regions.middleCenter.count;
    
    const topLeftPercentage = Math.round((topLeftQuad / totalPoints) * 100);
    const topRightPercentage = Math.round((topRightQuad / totalPoints) * 100);
    const bottomLeftPercentage = Math.round((bottomLeftQuad / totalPoints) * 100);
    const bottomRightPercentage = Math.round((bottomRightQuad / totalPoints) * 100);

    // Calculate center vs periphery
    const centerCount = regions.middleCenter.count;
    const centerPercentage = Math.round((centerCount / totalPoints) * 100);
    const peripheryPercentage = 100 - centerPercentage;

    // Calculate top vs bottom
    const topHalf = regions.topLeft.count + regions.topCenter.count + regions.topRight.count + 
                    regions.middleLeft.count + regions.middleCenter.count + regions.middleRight.count;
    const bottomHalf = regions.bottomLeft.count + regions.bottomCenter.count + regions.bottomRight.count;
    const topPercentage = Math.round((topHalf / totalPoints) * 100);
    const bottomPercentage = Math.round((bottomHalf / totalPoints) * 100);

    // Calculate left vs right
    const leftSide = regions.topLeft.count + regions.middleLeft.count + regions.bottomLeft.count;
    const rightSide = regions.topRight.count + regions.middleRight.count + regions.bottomRight.count;
    const leftPercentage = Math.round((leftSide / totalPoints) * 100);
    const rightPercentage = Math.round((rightSide / totalPoints) * 100);

    // Find most viewed coordinates (hotspots)
    const coordinateMap = new Map();
    data.forEach(point => {
      const gridX = Math.floor(point.x / 50) * 50; // Round to 50px grid
      const gridY = Math.floor(point.y / 50) * 50;
      const key = `${gridX},${gridY}`;
      coordinateMap.set(key, (coordinateMap.get(key) || 0) + 1);
    });
    
    const topHotspots = Array.from(coordinateMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([coord, count]) => {
        const [x, y] = coord.split(',').map(Number);
        return { x, y, count, percentage: Math.round((count / totalPoints) * 100) };
      });

    // Generate comprehensive insights
    const generatedInsights = [];

    // Primary attention area with percentage
    if (hottestRegion.count > totalPoints * 0.15) {
      const regionName = hottestRegion.key.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase());
      generatedInsights.push({
        type: 'primary',
        title: 'Primary Attention Hotspot',
        description: `${hottestRegion.percentage}% of gaze time spent in ${regionName} region (${hottestRegion.count} points).`,
        recommendation: 'This is your highest engagement area. Place critical content, CTAs, or key information here.',
        data: { region: hottestRegion.key, percentage: hottestRegion.percentage, count: hottestRegion.count }
      });
    }

    // Region breakdown
    generatedInsights.push({
      type: 'pattern',
      title: 'Screen Region Distribution',
      description: `Top regions: ${regionEntries
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([key, r]) => `${key.replace(/([A-Z])/g, ' $1')} (${r.percentage}%)`)
        .join(', ')}`,
      recommendation: 'Use this distribution to optimize content placement across screen regions.',
      data: { regions: Object.fromEntries(regionEntries.map(([k, v]) => [k, { percentage: v.percentage, count: v.count }])) }
    });

    // Quadrant analysis
    const dominantQuadrant = [
      { name: 'Top-Left', percentage: topLeftPercentage },
      { name: 'Top-Right', percentage: topRightPercentage },
      { name: 'Bottom-Left', percentage: bottomLeftPercentage },
      { name: 'Bottom-Right', percentage: bottomRightPercentage }
    ].sort((a, b) => b.percentage - a.percentage)[0];

    if (dominantQuadrant.percentage > 30) {
      generatedInsights.push({
        type: 'pattern',
        title: 'Dominant Quadrant',
        description: `${dominantQuadrant.percentage}% of attention in ${dominantQuadrant.name} quadrant.`,
        recommendation: 'Users are primarily focused in this area. Consider this when designing layout hierarchy.',
        data: { quadrant: dominantQuadrant.name, percentage: dominantQuadrant.percentage }
      });
    }

    // Center vs Periphery
    if (centerPercentage > 40) {
      generatedInsights.push({
        type: 'pattern',
        title: 'Center-Focused Pattern',
        description: `${centerPercentage}% center, ${peripheryPercentage}% periphery. Users follow natural reading patterns.`,
        recommendation: 'Center content receives most attention. Place primary information in the center region.',
        data: { center: centerPercentage, periphery: peripheryPercentage }
      });
    }

    // Top vs Bottom
    if (topPercentage > 60) {
      generatedInsights.push({
        type: 'pattern',
        title: 'Top-Heavy Attention',
        description: `${topPercentage}% top half, ${bottomPercentage}% bottom half.`,
        recommendation: 'Users scan top-to-bottom. Place navigation and primary content in the upper section.',
        data: { top: topPercentage, bottom: bottomPercentage }
      });
    }

    // Left vs Right
    if (Math.abs(leftPercentage - rightPercentage) > 15) {
      const dominant = leftPercentage > rightPercentage ? 'Left' : 'Right';
      const dominantPct = leftPercentage > rightPercentage ? leftPercentage : rightPercentage;
      generatedInsights.push({
        type: 'pattern',
        title: `${dominant} Side Dominance`,
        description: `${dominantPct}% ${dominant.toLowerCase()} side, ${100 - dominantPct}% right side.`,
        recommendation: `Users favor the ${dominant.toLowerCase()} side. Consider this for content layout and navigation.`,
        data: { left: leftPercentage, right: rightPercentage }
      });
    }

    // Hotspots
    if (topHotspots.length > 0 && topHotspots[0].percentage > 5) {
      generatedInsights.push({
        type: 'primary',
        title: 'Top Gaze Hotspots',
        description: `Most viewed coordinates: ${topHotspots.map(h => `(${h.x}, ${h.y}) - ${h.percentage}%`).join(', ')}`,
        recommendation: 'These specific coordinates receive the most attention. Consider placing important elements near these points.',
        data: { hotspots: topHotspots }
      });
    }

    // Least viewed area
    if (coldestRegion.count < totalPoints * 0.05) {
      generatedInsights.push({
        type: 'warning',
        title: 'Low Engagement Area',
        description: `${coldestRegion.key.replace(/([A-Z])/g, ' $1')} region: ${coldestRegion.percentage}% attention (${coldestRegion.count} points).`,
        recommendation: 'This area receives minimal attention. Consider repositioning important content or improving visual hierarchy.',
        data: { region: coldestRegion.key, percentage: coldestRegion.percentage, count: coldestRegion.count }
      });
    }

    return {
      totalPoints,
      regions,
      insights: generatedInsights,
      summary: `Analyzed ${totalPoints} gaze points. Primary hotspot: ${hottestRegion.key.replace(/([A-Z])/g, ' $1')} (${hottestRegion.percentage}%). Top region: ${dominantQuadrant.name} (${dominantQuadrant.percentage}%).`,
      metrics: {
        quadrants: { topLeft: topLeftPercentage, topRight: topRightPercentage, bottomLeft: bottomLeftPercentage, bottomRight: bottomRightPercentage },
        topBottom: { top: topPercentage, bottom: bottomPercentage },
        leftRight: { left: leftPercentage, right: rightPercentage },
        centerPeriphery: { center: centerPercentage, periphery: peripheryPercentage },
        hotspots: topHotspots
      }
    };
  };

  // Always show the component when visible, even if no data yet
  if (!isVisible) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 20,
      zIndex: 10003,
      maxWidth: '400px'
    }}>
      {!showPanel ? (
        <button
          onClick={() => setShowPanel(true)}
          style={{
            padding: '12px 20px',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📊</span>
          Gaze Insights
        </button>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          border: '1px solid #e2e8f0',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📊</span>
              Gaze Insights
            </h3>
            <button
              onClick={() => setShowPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#64748b',
                padding: 0,
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>

          {isAnalyzing ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#64748b'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e2e8f0',
                borderTop: '3px solid #6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p style={{ margin: 0 }}>
                Analyzing gaze patterns...
              </p>
            </div>
          ) : insights ? (
            <>
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: '1.6'
                }}>
                  {insights.summary}
                </p>
                {insights.error && (
                  <p style={{
                    margin: '8px 0 0 0',
                    fontSize: '12px',
                    color: '#f59e0b',
                    fontStyle: 'italic'
                  }}>
                    ⚠️ {insights.error}
                  </p>
                )}
              </div>

              {insights.insights && insights.insights.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {insights.insights.map((insight, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `2px solid ${
                          insight.type === 'primary' ? '#6366f1' :
                          insight.type === 'warning' ? '#f59e0b' :
                          insight.type === 'success' ? '#10b981' :
                          '#8b5cf6'
                        }`,
                        backgroundColor: `${
                          insight.type === 'primary' ? '#eef2ff' :
                          insight.type === 'warning' ? '#fffbeb' :
                          insight.type === 'success' ? '#ecfdf5' :
                          '#f5f3ff'
                        }`
                      }}
                    >
                      <h4 style={{
                        margin: '0 0 8px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1e293b'
                      }}>
                        {insight.title}
                      </h4>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        color: '#475569',
                        lineHeight: '1.5'
                      }}>
                        {insight.description}
                      </p>
                      {insight.recommendation && (
                        <p style={{
                          margin: 0,
                          fontSize: '13px',
                          color: '#64748b',
                          fontStyle: 'italic',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(0,0,0,0.1)'
                        }}>
                          💡 {insight.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
                  No specific insights available. Collect more gaze data for better analysis.
                </p>
              )}
            </>
          ) : (
            <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
              {heatmapData && heatmapData.length > 0 
                ? 'No insights available yet. Collect more gaze data for analysis.'
                : 'No gaze data collected yet. Start browsing to collect gaze data for insights.'}
            </p>
          )}

          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default AIInsights;

