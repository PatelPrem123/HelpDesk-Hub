import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, PauseCircle } from 'lucide-react';

export function SLATimer({ deadline, isPaused, isBreached }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgency, setUrgency] = useState('normal'); // normal, warning, critical, breached

  useEffect(() => {
    if (isBreached) {
      setUrgency('breached');
      setTimeLeft('SLA Breached');
      return;
    }

    if (isPaused) {
      setUrgency('paused');
      setTimeLeft('Clock Paused');
      return;
    }

    function calculateTime() {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setUrgency('breached');
        setTimeLeft('SLA Breached');
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (hours < 1) {
        setUrgency('critical');
      } else if (hours < 4) {
        setUrgency('warning');
      } else {
        setUrgency('normal');
      }

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [deadline, isPaused, isBreached]);

  const colorStyles = {
    normal: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
    warning: 'text-amber-400 bg-amber-950/40 border-amber-800/50 animate-pulse',
    critical: 'text-rose-400 bg-rose-950/40 border-rose-800/50 animate-pulse font-bold',
    breached: 'text-red-400 bg-red-950/60 border-red-700 font-bold',
    paused: 'text-orange-300 bg-orange-950/40 border-orange-700/50'
  };

  return (
    <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-xs ${colorStyles[urgency]}`}>
      {isPaused ? (
        <PauseCircle className="w-3.5 h-3.5" />
      ) : urgency === 'breached' || urgency === 'critical' ? (
        <AlertTriangle className="w-3.5 h-3.5" />
      ) : (
        <Clock className="w-3.5 h-3.5" />
      )}
      <span>{timeLeft}</span>
    </div>
  );
}
