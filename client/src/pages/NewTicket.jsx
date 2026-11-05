import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { PlusCircle, Paperclip, Send, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NewTicket() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    priority: 'Medium'
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.get('/categories');
        const cats = res.data.data.categories;
        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCategory(cats[0]);
          setFormData(prev => ({
            ...prev,
            category: cats[0]._id,
            subcategory: cats[0].subcategories[0] || 'General',
            priority: cats[0].defaultPriority || 'Medium'
          }));
        }
      } catch (err) {
        showToast('Failed to load categories', 'error');
      }
    }
    loadCategories();
  }, []);

  const handleCategoryChange = (e) => {
    const catId = e.target.value;
    const cat = categories.find(c => c._id === catId);
    setSelectedCategory(cat);
    setFormData(prev => ({
      ...prev,
      category: catId,
      subcategory: cat?.subcategories[0] || 'General',
      priority: cat?.defaultPriority || 'Medium'
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create Ticket
      const res = await api.post('/tickets', {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory,
        priority: formData.priority
      });

      const ticketId = res.data.data.ticket._id;

      // 2. Upload Attachment if selected
      if (file) {
        const fileData = new FormData();
        fileData.append('file', file);
        await api.post(`/tickets/${ticketId}/comments/attachments`, fileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      showToast(`Ticket ${res.data.data.ticket.ticketNumber} submitted!`, 'success');
      navigate(`/tickets/${ticketId}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link
          to="/"
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Submit Support Ticket</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Describe your technical issue for Level 1/2 IT Support investigation</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Incident Summary (Title) *
            </label>
            <input
              type="text"
              required
              maxLength={150}
              placeholder="e.g. VPN Error 800 during corporate authentication"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={handleCategoryChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Subcategory *
              </label>
              <select
                value={formData.subcategory}
                onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {selectedCategory?.subcategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                )) || <option value="General">General</option>}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Low">P4 - Low (General Inquiry)</option>
                <option value="Medium">P3 - Medium (Standard Incident)</option>
                <option value="High">P2 - High (Work Impaired)</option>
                <option value="Critical">P1 - Critical (Outage / Production Down)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Technical Description & Steps to Reproduce *
            </label>
            <textarea
              required
              rows={6}
              maxLength={5000}
              placeholder="Provide exact error codes, diagnostic logs, steps taken, and impact..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Attachment (Screenshot or Log Dump)
            </label>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium transition-colors">
                <Paperclip className="w-4 h-4 text-slate-500" />
                <span>{file ? file.name : 'Choose File (PDF, PNG, JPG, TXT)'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0])}
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                />
              </label>
              {file && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/25 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting...' : 'Submit Incident'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
