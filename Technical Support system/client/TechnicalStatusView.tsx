import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, ShieldAlert, Clock, CheckCircle2, 
  ChevronRight, AlertCircle, AlertTriangle,
  MessageSquare, Send, Paperclip, X,
  FileText, ImageIcon, Loader2, User,
  CornerDownRight, Globe, Info
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TechnicalEventRow } from '../../../types/database';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const TechnicalStatusView: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<TechnicalEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<TechnicalEventRow | null>(null);
  const [reply, setReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('technical_events')
        .select('*')
        .in('status', ['active', 'scheduled', 'resolved'])
        .order('created_at', { ascending: false });
      setEvents(data || []);

      if (user) {
        const { data: myResponses } = await supabase
          .from('technical_event_responses')
          .select('event_id, is_confirmed')
          .eq('user_id', user.id);
        
        const confMap: Record<string, boolean> = {};
        myResponses?.forEach(r => {
          if (r.is_confirmed) confMap[r.event_id] = true;
        });
        setConfirmations(confMap);
      }
    } catch (err) {
      toast.error('Failed to load system status');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleConfirm = async (eventId: string, message: string = '') => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('technical_event_responses')
        .insert({
          event_id: eventId,
          user_id: user.id,
          message: message || null,
          is_confirmed: true
        });
      
      if (error) throw error;
      
      setConfirmations(prev => ({ ...prev, [eventId]: true }));
      toast.success('Acknowledgment sent to Technical Team');
      setReply('');
      if (selectedEvent?.id === eventId) setSelectedEvent(null);
    } catch (err) {
      toast.error('Failed to send confirmation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityStyles = (sev: string) => {
    switch (sev) {
      case 'critical': return { color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
      case 'high': return { color: '#f97316', bg: '#fff7ed', border: '#ffedd5' };
      case 'medium': return { color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' };
      default: return { color: '#3b82f6', bg: '#eff6ff', border: '#dbeafe' };
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 opacity-50">
      <Loader2 className="w-10 h-10 animate-spin mb-4" />
      <p className="font-bold">Fetching system status...</p>
    </div>
  );

  return (
    <div className="status-container">
      {/* Overview Cards */}
      <div className="status-overview">
        <div className="overall-card">
          <div className="pulse-icon">
            <Activity className="w-8 h-8 text-green-500" />
            <div className="pulse-ring"></div>
          </div>
          <div>
            <h2>Core Systems Operational</h2>
            <p>All primary services are currently performing normally.</p>
          </div>
          <div className="uptime-badge">99.9% Uptime</div>
        </div>
      </div>

      <div className="events-grid">
        <div className="active-events-section">
          <h3 className="section-title"><ShieldAlert className="w-5 h-5" /> Recent Technical Alerts</h3>
          {events.length === 0 ? (
            <div className="empty-alerts">
              <CheckCircle2 className="w-12 h-12 text-green-500 opacity-20" />
              <p>No active incidents or maintenance scheduled.</p>
            </div>
          ) : (
            <div className="events-list">
              {events.map(event => {
                const styles = getSeverityStyles(event.severity);
                const isConfirmed = confirmations[event.id];
                
                return (
                  <div 
                    key={event.id} 
                    className={`event-card ${event.status}`}
                    style={{ borderLeft: `4px solid ${styles.color}` }}
                  >
                    <div className="event-main">
                      <div className="event-header">
                        <div className="event-type" style={{ color: styles.color, background: styles.bg }}>
                          {event.type.toUpperCase()}
                        </div>
                        <span className="event-date">{new Date(event.created_at).toLocaleString()}</span>
                      </div>
                      <h4 className="event-title">{event.title}</h4>
                      <p className="event-excerpt">{event.content.substring(0, 150)}...</p>
                      
                      <div className="event-meta">
                        <div className="meta-pill"><Activity className="w-3.5 h-3.5" /> {event.affected_services.join(', ')}</div>
                        {event.status === 'resolved' && <div className="meta-pill resolved"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved</div>}
                      </div>
                    </div>

                    <div className="event-actions">
                      {isConfirmed ? (
                        <div className="confirmed-status">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span>Acknowledged</span>
                        </div>
                      ) : (
                        <button className="btn-confirm" onClick={() => setSelectedEvent(event)}>
                          Review & Acknowledge <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="status-sidebar">
          <div className="sidebar-info-card">
            <h4><Info className="w-4 h-4" /> Technical Support</h4>
            <p>Our infrastructure team monitors the portal 24/7. Critical issues are typically addressed within 30 minutes.</p>
            <div className="contact-line">Emergency: <span className="text-indigo-600">support@admissiondesk.online</span></div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedEvent && (
        <div className="kb-modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedEvent(null)}>
          <div className="kb-ticket-page-card animate-in zoom-in" style={{ maxWidth: '700px' }}>
            <div className="kb-ticket-header" style={{ borderLeft: `6px solid ${getSeverityStyles(selectedEvent.severity).color}` }}>
              <div className="kb-modal-header-content">
                <div className="kb-title-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <h1>Technical Announcement</h1>
                  <p>Issue ID: {selectedEvent.id.slice(0, 8)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="kb-close-btn"><X /></button>
            </div>

            <div className="modal-scroll-body" style={{ padding: '2.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="event-full-details">
                <div className="detail-row">
                  <div className="detail-item">
                    <label>Affected Services</label>
                    <div className="chips-row">
                      {selectedEvent.affected_services.map(s => <span key={s} className="service-chip">{s}</span>)}
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>Severity Level</label>
                    <div className="severity-badge" style={{ color: getSeverityStyles(selectedEvent.severity).color }}>
                      <AlertTriangle className="w-4 h-4" /> {selectedEvent.severity.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="content-body">
                  <h3>Technical Description</h3>
                  <div className="technical-text">
                    {selectedEvent.content}
                  </div>
                </div>

                <div className="acknowledgment-form">
                  <h3>Confirm Receipt</h3>
                  <p>Please confirm you have read this announcement. You can also leave a message for the Technical Team.</p>
                  <textarea 
                    placeholder="Add an optional message or question for the technical team..."
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    rows={4}
                  />
                  <div className="form-actions">
                    <button className="btn-cancel" onClick={() => setSelectedEvent(null)}>Cancel</button>
                    <button 
                      className="btn-confirm-action" 
                      onClick={() => handleConfirm(selectedEvent.id, reply)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <>I Confirm & Understand <Send className="w-4 h-4" /></>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .status-container { display: flex; flex-direction: column; gap: 3rem; padding-bottom: 5rem; }
        .status-overview { width: 100%; }
        .overall-card { background: white; border: 1px solid #e2e8f0; border-radius: 2rem; padding: 2.5rem; display: flex; align-items: center; gap: 2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
        .pulse-icon { position: relative; width: 64px; height: 64px; background: #ecfdf5; border-radius: 20px; display: flex; align-items: center; justify-content: center; }
        .pulse-ring { position: absolute; inset: 0; border-radius: 20px; border: 2px solid #10b981; animation: pulse-ring 2s infinite; }
        .overall-card h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem; }
        .overall-card p { color: #64748b; font-size: 0.95rem; margin: 0; }
        .uptime-badge { margin-left: auto; padding: 0.5rem 1rem; background: #f0fdf4; color: #10b981; border-radius: 99px; font-size: 0.875rem; font-weight: 800; border: 1px solid #dcfce7; }

        .events-grid { display: grid; grid-template-columns: 1fr 320px; gap: 2.5rem; }
        .section-title { display: flex; align-items: center; gap: 0.75rem; font-size: 1.25rem; font-weight: 800; color: #1e293b; margin-bottom: 2rem; }
        .events-list { display: flex; flex-direction: column; gap: 1.25rem; }
        .event-card { background: white; border: 1px solid #f1f5f9; border-radius: 1.5rem; padding: 2rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
        .event-card:hover { transform: translateY(-4px); box-shadow: 0 15px 30px rgba(0,0,0,0.05); }
        .event-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        .event-type { padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.7rem; font-weight: 800; }
        .event-date { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }
        .event-title { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 0.75rem; }
        .event-excerpt { font-size: 0.95rem; color: #475569; margin-bottom: 1.5rem; line-height: 1.6; }
        .event-meta { display: flex; gap: 1rem; }
        .meta-pill { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.8rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 99px; font-size: 0.8rem; font-weight: 700; color: #64748b; }
        .meta-pill.resolved { background: #f0fdf4; color: #10b981; border-color: #dcfce7; }

        .btn-confirm { padding: 0.75rem 1.5rem; background: #4f46e5; color: white; border: none; border-radius: 1rem; font-weight: 700; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; transition: all 0.2s; }
        .btn-confirm:hover { background: #4338ca; transform: translateX(5px); }
        .confirmed-status { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; color: #10b981; font-weight: 700; font-size: 0.8rem; }

        .sidebar-info-card { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 1.5rem; padding: 1.5rem; }
        .sidebar-info-card h4 { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 800; color: #1e293b; margin-bottom: 1rem; }
        .sidebar-info-card p { font-size: 0.875rem; color: #64748b; line-height: 1.5; margin-bottom: 1.5rem; }
        .contact-line { font-size: 0.8rem; font-weight: 700; color: #475569; }

        .detail-row { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2.5rem; }
        .detail-item label { display: block; font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.75rem; }
        .chips-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .service-chip { padding: 0.4rem 0.8rem; background: #f1f5f9; border-radius: 8px; font-size: 0.8rem; font-weight: 700; color: #475569; }
        .severity-badge { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 800; }
        .content-body h3 { font-size: 1.125rem; font-weight: 800; color: #0f172a; margin-bottom: 1rem; }
        .technical-text { font-size: 1.05rem; line-height: 1.7; color: #334155; padding: 2rem; background: #fbfbfe; border: 1px solid #f1f5f9; border-radius: 1.5rem; margin-bottom: 3rem; }
        
        .acknowledgment-form { padding: 2.5rem; background: #f8fafc; border-radius: 1.5rem; border: 1px solid #edf2f7; }
        .acknowledgment-form h3 { font-size: 1.125rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
        .acknowledgment-form p { font-size: 0.9rem; color: #64748b; margin-bottom: 1.5rem; }
        .acknowledgment-form textarea { width: 100%; padding: 1rem; border-radius: 1rem; border: 2px solid #e2e8f0; font-size: 0.95rem; background: white; margin-bottom: 1.5rem; }
        .form-actions { display: flex; justify-content: flex-end; gap: 1rem; }
        .btn-cancel { padding: 0.75rem 1.5rem; background: white; border: 1px solid #e2e8f0; border-radius: 1rem; font-weight: 700; color: #64748b; cursor: pointer; }
        .btn-confirm-action { padding: 0.75rem 1.75rem; background: #4f46e5; color: white; border: none; border-radius: 1rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }

        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      ` }} />
    </div>
  );
};

export default TechnicalStatusView;
