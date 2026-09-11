import React, { useState, useEffect, useRef } from 'react';

export default function AnimatedNumber({ value = 0, duration = 450, prefix = '', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(Number(value) || 0);
  const prevValueRef = useRef(Number(value) || 0);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const targetVal = Number(value) || 0;
    prevValueRef.current = targetVal;

    if (startVal === targetVal) {
      setDisplayValue(targetVal);
      return;
    }

    let startTimestamp = null;
    let animationFrame;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (targetVal - startVal) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span className="animated-kpi-number" style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}
