import React, { useState, useEffect } from 'react';
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
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const PRIORITY_COLORS = {
  Critical: '#f43f5e',
  High: '#f97316',
  Medium: '#3b82f6',
  Low: '#64748b'
};

export function AdminConsole() {
  const [metrics, setMetrics] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [metricsRes, workloadRes, auditRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/workload'),
          api.get('/analytics/audit-logs?limit=10')
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
  }, []);

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

  return (
    <div className="space-y-8">
      {/* Header and Export Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <LayoutDashboard className="w-6 h-6 text-blue-500" />
            <span>ITSM Supervisory Console & KPI Analytics</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Platform health, Mean Time to Resolve (MTTR), technician workload, and compliance audit trail
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (XLSX)</span>
          </button>
        </div>
      </div>

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
          <div className="text-2xl font-bold text-blue-500 mt-2">
            {metrics?.summary?.openTickets}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">SLA Breaches</span>
          <div className="text-2xl font-bold text-rose-500 mt-2">
            {metrics?.summary?.breachedTickets}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">Breach Rate</span>
          <div className="text-2xl font-bold text-amber-500 mt-2">
            {metrics?.summary?.breachPercentage}%
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">MTTR (Hours)</span>
          <div className="text-2xl font-bold text-indigo-400 mt-2">
            {metrics?.summary?.mttrHours}h
          </div>
        </div>
      </div>

      {/* Recharts Analytics Charts */}
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

      {/* Technician Workload Distribution */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden space-y-4 p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
          <Users className="w-4 h-4 text-blue-500" />
          <span>Active Technician Workload Heatmap</span>
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
                  <td className="py-3 px-3 font-mono font-bold text-sm text-blue-500">
                    {tech.activeTickets}
                  </td>
                  <td className="py-3 px-3">
                    {tech.activeTickets > 5 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900/40 text-rose-300 border border-rose-700">
                        Overloaded
                      </span>
                    ) : tech.activeTickets > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/40 text-emerald-300 border border-emerald-700">
                        Optimal
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
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

      {/* Forensic Audit Log Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Immutable Forensic Audit Log Trail</span>
        </h2>

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
                  <td className="py-2.5 px-3 text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-blue-400">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{log.entityType}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">
                    {log.performedBy?.name || 'System'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
