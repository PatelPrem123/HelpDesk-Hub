import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  LayoutDashboard,
  PlusCircle,
  KanbanSquare,
  BarChart3,
  Sliders,
  FileSpreadsheet,
  History,
  Ticket
} from 'lucide-react';

export function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const isStaff = user.role === 'Technician' || user.role === 'Administrator';
  const isAdmin = user.role === 'Administrator';

  const linkClass = ({ isActive }) =>
    `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
    }`;

  return (
    <aside className="w-64 shrink-0 hidden md:block bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 min-h-[calc(100vh-61px)] transition-colors">
      <div className="space-y-6">
        {/* Core Actions */}
        <div>
          <NavLink
            to="/tickets/new"
            className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Ticket</span>
          </NavLink>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Operations
          </div>

          <NavLink to="/" end className={linkClass}>
            <Ticket className="w-4 h-4" />
            <span>My Support Tickets</span>
          </NavLink>

          {isStaff && (
            <NavLink to="/queue" className={linkClass}>
              <KanbanSquare className="w-4 h-4" />
              <span>Technician Kanban</span>
            </NavLink>
          )}

          {isAdmin && (
            <>
              <div className="pt-4 px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Administration
              </div>

              <NavLink to="/admin" end className={linkClass}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Supervisory Overview</span>
              </NavLink>

              <NavLink to="/admin/analytics" className={linkClass}>
                <BarChart3 className="w-4 h-4" />
                <span>KPIs & Workload</span>
              </NavLink>

              <NavLink to="/admin/audit" className={linkClass}>
                <History className="w-4 h-4" />
                <span>Forensic Audit Ledger</span>
              </NavLink>

              <NavLink to="/admin/export" className={linkClass}>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Data Exports</span>
              </NavLink>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
