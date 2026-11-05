import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { StatusBadge, PriorityBadge } from '../components/common/Badge.jsx';
import { SLATimer } from '../components/tickets/SLATimer.jsx';
import { KanbanSquare, UserCheck, ArrowRight, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

const KANBAN_COLUMNS = [
  { id: 'New', title: 'Triage Queue', status: 'New' },
  { id: 'Assigned', title: 'Assigned Work', status: 'Assigned' },
  { id: 'In Progress', title: 'Investigation', status: 'In Progress' },
  { id: 'Pending User', title: 'Pending User (Paused)', status: 'Pending User' },
  { id: 'Resolved', title: 'Remediated', status: 'Resolved' }
];

export function TechQueue() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    try {
      const res = await api.get('/tickets?limit=100');
      setTickets(res.data.data.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();

    if (socket) {
      socket.on('ticket:created', (data) => {
        showToast(`New Incident Logged: ${data.ticketNumber} (${data.priority})`, 'info');
        loadTickets();
      });
      socket.on('ticket:assigned', () => loadTickets());
      socket.on('ticket:status_changed', () => loadTickets());
      socket.on('sla:breached', (data) => {
        showToast(`CRITICAL SLA BREACH: Ticket ${data.ticketNumber}`, 'error');
        loadTickets();
      });
    }

    return () => {
      if (socket) {
        socket.off('ticket:created');
        socket.off('ticket:assigned');
        socket.off('ticket:status_changed');
        socket.off('sla:breached');
      }
    };
  }, [socket]);

  const handleClaim = async (ticketId) => {
    try {
      await api.patch(`/tickets/${ticketId}/assign`, {
        assignedTechnicianId: user._id
      });
      showToast('Ticket claimed and assigned to your queue', 'success');
      loadTickets();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAdvanceStatus = async (ticketId, nextStatus) => {
    try {
      await api.patch(`/tickets/${ticketId}/status`, {
        status: nextStatus,
        ...(nextStatus === 'Resolved' ? { resolutionSummary: 'Issue investigated and remediated by technician.' } : {})
      });
      showToast(`Ticket status updated to ${nextStatus}`, 'success');
      loadTickets();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <KanbanSquare className="w-6 h-6 text-blue-500" />
            <span>Technician Operational Kanban</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time incident dispatch, SLA deadline enforcement, and state progression
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading technician queues...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto min-h-[650px] pb-4">
          {KANBAN_COLUMNS.map(col => {
            const colTickets = tickets.filter(t => t.status === col.status);

            return (
              <div
                key={col.id}
                className="bg-slate-100 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-2 mb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {col.title}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {colTickets.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTickets.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-[11px] text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl">
                      No active tickets
                    </div>
                  ) : (
                    colTickets.map(ticket => (
                      <div
                        key={ticket._id}
                        className={`bg-white dark:bg-slate-800 rounded-xl p-3.5 border shadow-sm space-y-3 transition-all hover:shadow-md ${
                          ticket.isBreached
                            ? 'border-red-500/80 bg-red-50/20 dark:bg-red-950/20'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {ticket.ticketNumber}
                          </span>
                          <PriorityBadge priority={ticket.priority} />
                        </div>

                        <Link
                          to={`/tickets/${ticket._id}`}
                          className="block font-semibold text-xs text-slate-900 dark:text-white hover:text-blue-500 line-clamp-2"
                        >
                          {ticket.title}
                        </Link>

                        <div className="text-[11px] text-slate-500">
                          Req: {ticket.requesterId?.name} ({ticket.requesterId?.department})
                        </div>

                        {/* SLA Indicator */}
                        <div className="pt-1">
                          <SLATimer
                            deadline={ticket.resolutionDeadline}
                            isPaused={ticket.isSlaPaused}
                            isBreached={ticket.isBreached}
                          />
                        </div>

                        {/* Technician Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                          {!ticket.assignedTechnicianId && (
                            <button
                              onClick={() => handleClaim(ticket._id)}
                              className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center space-x-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Claim Issue</span>
                            </button>
                          )}

                          {ticket.status === 'Assigned' && (
                            <button
                              onClick={() => handleAdvanceStatus(ticket._id, 'In Progress')}
                              className="w-full py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center space-x-1"
                            >
                              <span>Start Work</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {ticket.status === 'In Progress' && (
                            <div className="flex space-x-1.5 w-full">
                              <button
                                onClick={() => handleAdvanceStatus(ticket._id, 'Pending User')}
                                className="flex-1 py-1 px-1.5 bg-orange-600/80 hover:bg-orange-600 text-white rounded text-[10px] font-medium"
                              >
                                Need Info
                              </button>
                              <button
                                onClick={() => handleAdvanceStatus(ticket._id, 'Resolved')}
                                className="flex-1 py-1 px-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-medium"
                              >
                                Resolve
                              </button>
                            </div>
                          )}

                          {ticket.status === 'Pending User' && (
                            <span className="text-[10px] text-orange-400 font-semibold italic">
                              Clock paused waiting on user
                            </span>
                          )}

                          {ticket.status === 'Resolved' && (
                            <span className="text-[10px] text-emerald-400 font-semibold">
                              Remediated • Awaiting 48h Close
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
