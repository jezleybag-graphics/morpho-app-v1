import React, { useState, useEffect } from 'react';
import './LoadingScreen.css';
import logo from '../assets/morpho LOGO 1024 x1024.png'; // Ensure this matches your actual file extension

const LoadingScreen = ({ duration = 2000 }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = 50; // Update every 50ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration]);

  // SVG Circle Math
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="loading-container">
      <div className="logo-wrapper">
        {/* The Progress Circle */}
        <svg className="progress-ring" width="200" height="200">
          <circle
            className="progress-ring__circle"
            stroke="#F4F3F2" // Updated to Theme White
            strokeWidth="4"
            fill="transparent"
            r={radius}
            cx="100"
            cy="100"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <img src={logo} alt="Morpho Logo" className="loading-logo" />
      </div>
      <p className="loading-motto">"Sip the moment, one cup at a time"</p>
    </div>
  );
};

export default LoadingScreen;
