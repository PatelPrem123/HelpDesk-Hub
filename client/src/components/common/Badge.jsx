import React from 'react';

const STATUS_STYLES = {
  'New': 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  'Open': 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50',
  'Assigned': 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  'In Progress': 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  'Pending User': 'bg-orange-900/40 text-orange-300 border-orange-700/50 animate-pulse',
  'Resolved': 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  'Closed': 'bg-slate-800 text-slate-400 border-slate-700',
  'Reopened': 'bg-rose-900/40 text-rose-300 border-rose-700/50',
  'Cancelled': 'bg-zinc-800 text-zinc-500 border-zinc-700'
};

const PRIORITY_STYLES = {
  'Critical': 'bg-rose-950/80 text-rose-300 border-rose-700 font-semibold',
  'High': 'bg-orange-950/80 text-orange-300 border-orange-700',
  'Medium': 'bg-blue-950/80 text-blue-300 border-blue-700',
  'Low': 'bg-slate-800/80 text-slate-400 border-slate-700'
};

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-slate-800 text-slate-400 border-slate-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const style = PRIORITY_STYLES[priority] || 'bg-slate-800 text-slate-400 border-slate-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {priority}
    </span>
  );
}
