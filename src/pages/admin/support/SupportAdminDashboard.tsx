import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy, Ticket, BookOpen, Settings, Plus, Filter,
  CheckCircle2, Clock, AlertCircle, MessageSquare,
  ArrowLeft, Loader2, BarChart3, Users, Star, ShieldAlert
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import TicketManager from './TicketManager';
import KnowledgeBaseManager from './KnowledgeBaseManager';
import FeedbackManager from './FeedbackManager';
import TechnicalEventManager from './TechnicalEventManager';
import toast from 'react-hot-toast';
import '../../dashboard/support/SupportPages.css';

const SupportAdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'tickets' | 'kb' | 'feedback' | 'events' | 'settings'>('tickets');
  const [stats, setStats] = useState({ open: 0, pending: 0, resolved: 0, articles: 0, feedback: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [openRes, pendingRes, resolvedRes, artRes, feedRes] = await Promise.all([
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open' as any),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['in_progress', 'awaiting_response'] as any[]),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'resolved' as any),
        supabase.from('kb_articles').select('id', { count: 'exact', head: true }),
        supabase.from('portal_feedback').select('id', { count: 'exact', head: true }).eq('is_read', false)
      ]);
      setStats({
        open: openRes.count || 0,
        pending: pendingRes.count || 0,
        resolved: resolvedRes.count || 0,
        articles: artRes.count || 0,
        feedback: feedRes.count || 0
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Realtime stats refresh
  useEffect(() => {
    const ch = supabase.channel('admin-support-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kb_articles' }, () => fetchStats())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchStats]);

  const statCards = [
    { label: 'Open Tickets', value: stats.open, icon: AlertCircle, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'In Progress', value: stats.pending, icon: Clock, color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: '#10b981', bg: '#ecfdf5' },
    { label: 'Unread Feedback', value: stats.feedback, icon: Star, color: '#d97706', bg: '#fffbeb' },
  ];

  return (
    <div className="support-admin">
      {/* Header */}
      <div className="support-admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/admin')} className="btn-secondary" style={{ padding: '0.5rem' }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1><LifeBuoy className="w-7 h-7" style={{ color: '#4f46e5' }} /> Support Administration</h1>
            <p>Manage support tickets, documentation, and user feedback.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary"><Filter className="w-4 h-4" /> Filters</button>
          <button className="btn-primary" onClick={() => setActiveTab('kb')}>
            <Plus className="w-4 h-4" /> New Article
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="support-stats">
        {statCards.map((s, i) => (
          <div key={i} className="support-stat-card">
            <div className="support-stat-icon" style={{ background: s.bg }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{loading ? '—' : s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="support-admin-tabs">
        <div className="support-admin-tab-nav">
          <button className={`support-admin-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>
            <Ticket className="w-4 h-4" /> Support Tickets
          </button>
          <button className={`support-admin-tab-btn ${activeTab === 'kb' ? 'active' : ''}`} onClick={() => setActiveTab('kb')}>
            <BookOpen className="w-4 h-4" /> Knowledge Base
          </button>
          <button className={`support-admin-tab-btn ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')}>
            <Star className="w-4 h-4" /> Portal Feedback
          </button>
          <button className={`support-admin-tab-btn ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
            <ShieldAlert className="w-4 h-4" /> Technical Alerts
          </button>
          <button className={`support-admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>

        <div>
          {activeTab === 'tickets' && <TicketManager />}
          {activeTab === 'kb' && <KnowledgeBaseManager />}
          {activeTab === 'feedback' && <FeedbackManager />}
          {activeTab === 'events' && <TechnicalEventManager />}
          {activeTab === 'settings' && (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Settings className="w-7 h-7" style={{ color: '#94a3b8' }} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Support Configuration</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '24rem', margin: '0 auto 1.5rem' }}>
                Configure email notifications, auto-responders, SLA timers, and ticket categories.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '32rem', margin: '0 auto' }}>
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #f1f5f9', textAlign: 'left' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Email Notifications</h4>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Resend API configured for support@admissiondesk.online</p>
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#10b981', fontSize: '0.65rem', fontWeight: 700 }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #f1f5f9', textAlign: 'left' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Edge Functions</h4>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>send-support-notification deployed</p>
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#10b981', fontSize: '0.65rem', fontWeight: 700 }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Deployed
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportAdminDashboard;
