import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  Clock,
  Download,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  BarChart3,
  History,
  CheckCircle2,
  Filter,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

const PRIORITY_COLORS = {
  Critical: '#f43f5e',
  High: '#f97316',
  Medium: '#3b82f6',
  Low: '#64748b'
};

export function AdminConsole() {
  const location = useLocation();
  const [metrics, setMetrics] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Determine active view based on current URL path
  const activeSection = location.pathname.includes('/audit')
    ? 'audit'
    : location.pathname.includes('/analytics')
    ? 'analytics'
    : location.pathname.includes('/export')
    ? 'export'
    : 'overview';

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [metricsRes, workloadRes, auditRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/workload'),
          api.get('/analytics/audit-logs?limit=25')
        ]);
        setMetrics(metricsRes.data.data);
        setTechnicians(workloadRes.data.data.technicians);
        setAuditLogs(auditRes.data.data.logs);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, [location.pathname]);

  const handleExportCsv = () => {
    window.open('/api/v1/analytics/export/csv', '_blank');
  };

  const handleExportExcel = () => {
    window.open('/api/v1/analytics/export/xlsx', '_blank');
  };

  if (loading) {
    return <div className="p-16 text-center text-slate-400">Loading supervisory metrics...</div>;
  }

  const priorityData = Object.entries(metrics?.priorityBreakdown || {}).map(([name, count]) => ({
    name,
    count,
    fill: PRIORITY_COLORS[name] || '#3b82f6'
  }));

  const statusData = Object.entries(metrics?.statusBreakdown || {}).map(([name, count]) => ({
    name,
    count
  }));

  const tabClass = (sectionName) =>
    `flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
      activeSection === sectionName
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
    }`;

  return (
    <div className="space-y-6">
      {/* Header and Quick Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            {activeSection === 'overview' && <LayoutDashboard className="w-6 h-6 text-blue-500" />}
            {activeSection === 'analytics' && <BarChart3 className="w-6 h-6 text-blue-500" />}
            {activeSection === 'audit' && <History className="w-6 h-6 text-blue-500" />}
            {activeSection === 'export' && <FileSpreadsheet className="w-6 h-6 text-blue-500" />}
            <span>
              {activeSection === 'overview' && 'Supervisory Overview & Health'}
              {activeSection === 'analytics' && 'KPI Analytics & Technician Workload'}
              {activeSection === 'audit' && 'Forensic Audit Ledger'}
              {activeSection === 'export' && 'Data Exports & Reports Hub'}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activeSection === 'overview' && 'Executive summary of ticket volumes, SLA compliance, and open incident distribution.'}
            {activeSection === 'analytics' && 'Workload capacity balance, priority trends, and technician allocation telemetry.'}
            {activeSection === 'audit' && 'Immutable, append-only security ledger tracking all user actions, assignments, and state transitions.'}
            {activeSection === 'export' && 'Download raw tickets data in CSV or formatted multi-sheet Excel workbooks.'}
          </p>
        </div>

        {/* Global Export Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors border border-slate-200 dark:border-slate-700"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 border-b border-slate-200 dark:border-slate-800">
        <Link to="/admin" className={tabClass('overview')}>
          <LayoutDashboard className="w-4 h-4" />
          <span>Supervisory Overview</span>
        </Link>
        <Link to="/admin/analytics" className={tabClass('analytics')}>
          <BarChart3 className="w-4 h-4" />
          <span>KPIs & Workload</span>
        </Link>
        <Link to="/admin/audit" className={tabClass('audit')}>
          <History className="w-4 h-4" />
          <span>Forensic Audit Ledger</span>
        </Link>
        <Link to="/admin/export" className={tabClass('export')}>
          <FileSpreadsheet className="w-4 h-4" />
          <span>Data Exports</span>
        </Link>
      </div>

      {/* =========================================================================
          VIEW 1: SUPERVISORY OVERVIEW
          ========================================================================= */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-400">Total Volume</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {metrics?.summary?.totalTickets}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-400">Open Tickets</span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {metrics?.summary?.openTickets}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-400">SLA Breaches</span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
                {metrics?.summary?.breachedTickets}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-400">Breach Rate</span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                {metrics?.summary?.breachPercentage}%
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-400">MTTR (Hours)</span>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                {metrics?.summary?.mttrHours}h
              </div>
            </div>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tickets by Priority Distribution
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tickets by State Machine Status
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-25} textAnchor="end" height={50} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Quick summaries row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>Technicians Quick Workload</span>
                </h3>
                <Link to="/admin/analytics" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  View Full Heatmap →
                </Link>
              </div>
              <div className="space-y-2">
                {technicians.slice(0, 3).map(tech => (
                  <div key={tech._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{tech.name}</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{tech.activeTickets} active tickets</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Recent Security Events</span>
                </h3>
                <Link to="/admin/audit" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  View Audit Ledger →
                </Link>
              </div>
              <div className="space-y-2 font-mono text-xs">
                {auditLogs.slice(0, 3).map(log => (
                  <div key={log._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{log.action}</span>
                    <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: KPIS & TECHNICIAN WORKLOAD
          ========================================================================= */}
      {activeSection === 'analytics' && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Priority Volume Breakdown
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ticket Pipeline by Lifecycle Status
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-25} textAnchor="end" height={50} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Full Workload Heatmap Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden space-y-4 p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span>Active Technician Workload Heatmap & Capacity</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="py-2.5 px-3">Technician</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Active Tickets Assigned</th>
                    <th className="py-2.5 px-3">Workload Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {technicians.map((tech) => (
                    <tr key={tech._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {tech.name}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{tech.department}</td>
                      <td className="py-3 px-3 font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                        {tech.activeTickets}
                      </td>
                      <td className="py-3 px-3">
                        {tech.activeTickets > 5 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700">
                            Overloaded
                          </span>
                        ) : tech.activeTickets > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700">
                            Optimal
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            Available
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: FORENSIC AUDIT LEDGER
          ========================================================================= */}
      {activeSection === 'audit' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Forensic Security & Audit Ledger Trail</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Showing {auditLogs.length} immutable chronological events captured across the platform.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-blue-600 dark:text-blue-400">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{log.entityType}</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-sans font-medium">
                      {log.performedBy?.name || 'System'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: DATA EXPORTS HUB
          ========================================================================= */}
      {activeSection === 'export' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CSV Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Raw Incident Data (CSV)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Full tabular export containing ticket sequence numbers, titles, departments, SLA deadlines, and resolution timings.
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-400">
                <div className="font-semibold text-slate-800 dark:text-slate-200">Security Features:</div>
                <div>• Formula Injection (OWASP CSV Injection) neutralized with prefix sanitization</div>
                <div>• Direct UTF-8 stream without memory buffers</div>
              </div>
              <button
                onClick={handleExportCsv}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Tickets CSV File</span>
              </button>
            </div>

            {/* Excel Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Enterprise Excel Workbook (.xlsx)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Formatted spreadsheet formatted with frozen header rows, styled column widths, and priority status highlights.
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-400">
                <div className="font-semibold text-slate-800 dark:text-slate-200">Workbook Highlights:</div>
                <div>• Auto-fitted column dimensions for high readability</div>
                <div>• Compatible with Microsoft Excel, LibreOffice, and Google Sheets</div>
              </div>
              <button
                onClick={handleExportExcel}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-colors flex items-center justify-center space-x-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Enterprise Excel Workbook</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
