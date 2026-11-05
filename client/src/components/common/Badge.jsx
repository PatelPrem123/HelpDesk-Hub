import React from 'react';

const STATUS_STYLES = {
  'New': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70 font-semibold shadow-xs',
  'Open': 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/70 font-semibold shadow-xs',
  'Assigned': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/70 font-semibold shadow-xs',
  'In Progress': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/70 font-semibold shadow-xs',
  'Pending User': 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70 font-semibold animate-pulse shadow-xs',
  'Resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70 font-semibold shadow-xs',
  'Closed': 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium',
  'Reopened': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70 font-semibold shadow-xs',
  'Cancelled': 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 font-medium'
};

const PRIORITY_STYLES = {
  'Critical': 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800 font-bold shadow-xs',
  'High': 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800 font-bold shadow-xs',
  'Medium': 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800 font-semibold shadow-xs',
  'Low': 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 font-medium'
};

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const style = PRIORITY_STYLES[priority] || 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {priority}
    </span>
  );
}
