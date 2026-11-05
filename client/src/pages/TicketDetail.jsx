import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { StatusBadge, PriorityBadge } from '../components/common/Badge.jsx';
import { SLATimer } from '../components/tickets/SLATimer.jsx';
import {
  ArrowLeft,
  Clock,
  User,
  Building,
  Lock,
  Send,
  Paperclip,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  FileText,
  ShieldCheck
} from 'lucide-react';

export function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket, joinTicket, leaveTicket } = useSocket();
  const { showToast } = useToast();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [commentFile, setCommentFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenModal, setShowReopenModal] = useState(false);

  const isStaff = user?.role === 'Technician' || user?.role === 'Administrator';
  const isOwner = ticket?.requesterId?._id === user?._id;

  const loadTicket = async () => {
    try {
      const [ticketRes, commentsRes, timelineRes] = await Promise.all([
        api.get(`/tickets/${id}`),
        api.get(`/tickets/${id}/comments`),
        api.get(`/tickets/${id}/comments/timeline`)
      ]);
      setTicket(ticketRes.data.data.ticket);
      setComments(commentsRes.data.data.comments);
      setTimeline(timelineRes.data.data.timeline);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
    joinTicket(id);

    if (socket) {
      socket.on('comment:new', (data) => {
        if (data.comment.ticketId === id) {
          setComments((prev) => [...prev, data.comment]);
        }
      });
      socket.on('ticket:status_changed', (data) => {
        if (data.ticketId === id) {
          loadTicket();
        }
      });
    }

    return () => {
      leaveTicket(id);
      if (socket) {
        socket.off('comment:new');
        socket.off('ticket:status_changed');
      }
    };
  }, [id, socket]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && !commentFile) return;

    setSubmitting(true);
    try {
      let uploadedAttachment = null;

      if (commentFile) {
        const fileData = new FormData();
        fileData.append('file', commentFile);
        const uploadRes = await api.post(`/tickets/${id}/comments/attachments`, fileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedAttachment = uploadRes.data.data.attachment;
      }

      const commentRes = await api.post(`/tickets/${id}/comments`, {
        content: newComment,
        isInternal: isStaff ? isInternal : false,
        attachments: uploadedAttachment ? [uploadedAttachment] : []
      });

      setNewComment('');
      setCommentFile(null);
      setIsInternal(false);
      showToast('Comment posted', 'success');
      loadTicket();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (nextStatus, extraData = {}) => {
    try {
      await api.patch(`/tickets/${id}/status`, {
        status: nextStatus,
        ...extraData
      });
      showToast(`Status updated to ${nextStatus}`, 'success');
      loadTicket();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return <div className="p-16 text-center text-slate-400">Loading ticket details...</div>;
  }

  if (!ticket) {
    return (
      <div className="p-16 text-center">
        <h2 className="text-xl font-bold">Ticket Not Found</h2>
        <Link to="/" className="text-blue-500 hover:underline mt-2 inline-block">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <Link
            to={isStaff ? '/queue' : '/'}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                {ticket.ticketNumber}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {ticket.title}
            </h1>
          </div>
        </div>

        {/* SLA Status Widget */}
        <div className="flex items-center space-x-3">
          <SLATimer
            deadline={ticket.resolutionDeadline}
            isPaused={ticket.isSlaPaused}
            isBreached={ticket.isBreached}
          />
        </div>
      </div>

      {/* Main Grid: Details & Discussion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Description, Comments, Discussion */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description Box */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Problem Description & Diagnostics
            </h2>
            <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </div>

            {/* Attachments */}
            {ticket.attachments?.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-400 block mb-2">Attached Diagnostic Evidence:</span>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>{att.originalName}</span>
                      <span className="text-[10px] text-slate-400">({(att.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Employee Resolution Actions (Accept or Dispute) */}
          {ticket.status === 'Resolved' && (isOwner || isStaff) && (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-5 text-emerald-200 space-y-3">
              <div className="flex items-center space-x-2 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Technician Remediated Incident</span>
              </div>
              <p className="text-xs text-emerald-300/80">
                Resolution Summary: {ticket.resolutionSummary || 'Remediation confirmed.'}
              </p>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => handleStatusChange('Closed')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition-colors"
                >
                  Accept & Close Ticket
                </button>
                <button
                  onClick={() => setShowReopenModal(true)}
                  className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow transition-colors flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Dispute & Reopen (48h)</span>
                </button>
              </div>
            </div>
          )}

          {/* Reopen Dispute Modal */}
          {showReopenModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Dispute Resolution</h3>
                <p className="text-xs text-slate-500">
                  Please explain why the issue is not resolved. The ticket will return to active technician triage.
                </p>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail what is still failing..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowReopenModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange('Reopened');
                      setShowReopenModal(false);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg"
                  >
                    Confirm Reopen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Threaded Discussion */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Communication Thread ({comments.length})
            </h2>

            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment._id}
                  className={`rounded-2xl p-4.5 border transition-all ${
                    comment.isInternal
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-500 font-bold flex items-center justify-center text-xs">
                        {comment.authorId?.name?.charAt(0) || 'U'}
                      </div>
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {comment.authorId?.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({comment.authorId?.role})
                      </span>
                      {comment.isInternal && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          <Lock className="w-3 h-3" />
                          <span>CONFIDENTIAL INTERNAL NOTE</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Post Comment Input */}
            <form onSubmit={handlePostComment} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <textarea
                rows={3}
                required
                maxLength={2000}
                placeholder={isInternal ? "Write internal technician notes (private to staff)..." : "Write a public reply..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* File upload */}
                  <label className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-blue-500 cursor-pointer">
                    <Paperclip className="w-4 h-4" />
                    <span>{commentFile ? commentFile.name : 'Attach file'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setCommentFile(e.target.files[0])}
                      accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                    />
                  </label>

                  {/* Internal note toggle for staff */}
                  {isStaff && (
                    <label className="flex items-center space-x-1.5 text-xs text-amber-500 dark:text-amber-400 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                      />
                      <Lock className="w-3.5 h-3.5" />
                      <span>Internal Note (Staff Only)</span>
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (1 Col): Meta, Requester, Assignee, Timeline */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ticket Details
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Requester</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {ticket.requesterId?.name} ({ticket.requesterId?.department})
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Assigned Tech</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {ticket.assignedTechnicianId?.name || 'Unassigned'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Category</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {ticket.category?.name}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Subcategory</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {ticket.subcategory}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Resolution Target</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(ticket.resolutionDeadline).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Audit Activity Timeline
            </h3>

            <div className="space-y-3 text-xs">
              {timeline.slice(0, 8).map((event, idx) => (
                <div key={idx} className="flex items-start space-x-2.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {event.action}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      by {event.performedBy?.name} • {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
