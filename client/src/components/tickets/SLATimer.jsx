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
    normal: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60 font-semibold',
    warning: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/60 font-semibold animate-pulse',
    critical: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/70 font-bold animate-pulse',
    breached: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-700 font-bold',
    paused: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/60 font-semibold'
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
