import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, ShieldAlert, Clock, CheckCircle2, 
  Plus, Search, Filter, MoreVertical, 
  Trash2, Edit, AlertTriangle, Activity,
  Globe, MessageSquare, Send, X,
  Paperclip, FileText, ImageIcon, Loader2, User
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TechnicalEventRow, TechnicalEventResponseRow } from '../../../types/database';
import toast from 'react-hot-toast';

const TechnicalEventManager: React.FC = () => {
  const [events, setEvents] = useState<TechnicalEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TechnicalEventRow | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [fetchingResponses, setFetchingResponses] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'incident' as any,
    severity: 'medium' as any,
    status: 'active' as any,
    affected_services: [] as string[],
    start_at: new Date().toISOString().slice(0, 16),
    end_at: '',
    is_global: true
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('technical_events')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) toast.error('Failed to load events');
    else setEvents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const fetchResponses = async (eventId: string) => {
    setFetchingResponses(true);
    const { data } = await supabase
      .from('technical_event_responses')
      .select('*, profiles:user_id(first_name, last_name, email, role, avatar_url)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    setResponses(data || []);
    setFetchingResponses(false);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const payload = {
      ...formData,
      created_by: userId,
      start_at: new Date(formData.start_at).toISOString(),
      end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null
    };

    if (selectedEvent) {
      const { error } = await supabase.from('technical_events').update(payload).eq('id', selectedEvent.id);
      if (error) toast.error('Update failed');
      else {
        toast.success('Event updated');
        setShowForm(false);
        fetchEvents();
      }
    } else {
      const { error } = await supabase.from('technical_events').insert(payload);
      if (error) toast.error('Creation failed');
      else {
        toast.success('Technical event published');
        setShowForm(false);
        fetchEvents();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently remove this technical event?')) return;
    const { error } = await supabase.from('technical_events').delete().eq('id', id);
    if (error) toast.error('Delete failed');
    else {
      toast.success('Deleted');
      fetchEvents();
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#64748b';
    }
  };

  return (
    <div className="ticket-admin-container" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Sidebar List */}
      <div className="ticket-admin-list" style={{ width: '450px' }}>
        <div className="list-header">
          <div className="search-box">
            <Search className="w-4 h-4 icon" />
            <input 
              placeholder="Search announcements..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => {
            setSelectedEvent(null);
            setFormData({
              title: '', content: '', type: 'incident', severity: 'medium',
              status: 'active', affected_services: [], start_at: new Date().toISOString().slice(0, 16),
              end_at: '', is_global: true
            });
            setShowForm(true);
          }}>
            <Plus className="w-4 h-4" /> New Alert
          </button>
        </div>

        <div className="tickets-scroll-area">
          {events.map(event => (
            <div 
              key={event.id} 
              className={`ticket-row ${selectedEvent?.id === event.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedEvent(event);
                fetchResponses(event.id);
                setShowForm(false);
              }}
            >
              <div className="ticket-main-info">
                <div className="ticket-top-line">
                  <span className="ticket-id" style={{ color: getSeverityColor(event.severity) }}>
                    {event.type.toUpperCase()}
                  </span>
                  <span className="ticket-date">{new Date(event.created_at).toLocaleDateString()}</span>
                </div>
                <div className="ticket-subject">{event.title}</div>
                <div className="ticket-meta">
                  <span className={`status-pill ${event.status}`}>
                    {event.status}
                  </span>
                  <span className="priority-pill" style={{ background: `${getSeverityColor(event.severity)}15`, color: getSeverityColor(event.severity) }}>
                    {event.severity}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ticket-admin-detail">
        {showForm ? (
          <div className="admin-form-container">
            <div className="form-header">
              <h2>{selectedEvent ? 'Edit Technical Event' : 'New Technical Announcement'}</h2>
              <button onClick={() => setShowForm(false)} className="close-btn"><X /></button>
            </div>
            <form onSubmit={handleCreateOrUpdate} className="admin-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Title</label>
                  <input 
                    required 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Major Database Maintenance"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                      <option value="incident">Incident / Issue</option>
                      <option value="maintenance">Scheduled Maintenance</option>
                      <option value="update">System Update</option>
                      <option value="alert">Security Alert</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Severity</label>
                    <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value as any})}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Affected Services (comma separated)</label>
                  <input 
                    value={formData.affected_services.join(', ')} 
                    onChange={e => setFormData({...formData, affected_services: e.target.value.split(',').map(s => s.trim())})}
                    placeholder="e.g. Dashboard, Application Portal, API"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={formData.start_at}
                      onChange={e => setFormData({...formData, start_at: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Expected End Time (Optional)</label>
                    <input 
                      type="datetime-local" 
                      value={formData.end_at}
                      onChange={e => setFormData({...formData, end_at: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Content / Technical Details</label>
                  <textarea 
                    required 
                    rows={6}
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    placeholder="Describe the issue or maintenance in detail..."
                  />
                </div>
              </div>
              <div className="form-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Publish Announcement</button>
              </div>
            </form>
          </div>
        ) : selectedEvent ? (
          <div className="event-detail-view">
            <div className="detail-header" style={{ borderLeft: `6px solid ${getSeverityColor(selectedEvent.severity)}` }}>
              <div className="header-top">
                <div className="title-group">
                  <div className="type-badge" style={{ background: `${getSeverityColor(selectedEvent.severity)}15`, color: getSeverityColor(selectedEvent.severity) }}>
                    <ShieldAlert className="w-4 h-4" /> {selectedEvent.type.toUpperCase()}
                  </div>
                  <h1>{selectedEvent.title}</h1>
                </div>
                <div className="action-buttons">
                  <button className="btn-icon" onClick={() => {
                    setFormData({
                      ...selectedEvent as any,
                      start_at: new Date(selectedEvent.start_at).toISOString().slice(0, 16),
                      end_at: selectedEvent.end_at ? new Date(selectedEvent.end_at).toISOString().slice(0, 16) : ''
                    });
                    setShowForm(true);
                  }}><Edit className="w-4 h-4" /></button>
                  <button className="btn-icon delete" onClick={() => handleDelete(selectedEvent.id)}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="header-meta">
                <div className="meta-item"><Clock className="w-4 h-4" /> Start: {new Date(selectedEvent.start_at).toLocaleString()}</div>
                {selectedEvent.end_at && <div className="meta-item"><CheckCircle2 className="w-4 h-4" /> Expected End: {new Date(selectedEvent.end_at).toLocaleString()}</div>}
                <div className="meta-item"><Globe className="w-4 h-4" /> {selectedEvent.is_global ? 'Global Alert' : 'Targeted Alert'}</div>
              </div>
            </div>

            <div className="detail-tabs">
              <div className="detail-tab active">Technical Details</div>
              <div className="detail-tab">Acknowledgments ({responses.length})</div>
            </div>

            <div className="detail-content">
              <div className="content-section">
                <h3>Affected Services</h3>
                <div className="services-chips">
                  {selectedEvent.affected_services.map(s => (
                    <span key={s} className="service-chip">{s}</span>
                  ))}
                </div>
              </div>
              
              <div className="content-section">
                <h3>Summary</h3>
                <div className="technical-body">
                  {selectedEvent.content}
                </div>
              </div>

              <div className="responses-section">
                <h3>Agent Confirmations & Messages</h3>
                {fetchingResponses ? (
                  <div className="loading-state"><Loader2 className="animate-spin" /> Loading responses...</div>
                ) : responses.length === 0 ? (
                  <div className="empty-state">No acknowledgments received yet.</div>
                ) : (
                  <div className="responses-list">
                    {responses.map(res => (
                      <div key={res.id} className="response-card">
                        <div className="res-header">
                          <div className="res-user">
                            <div className="res-avatar">
                              {res.profiles?.avatar_url ? <img src={res.profiles.avatar_url} /> : <User />}
                            </div>
                            <div>
                              <div className="res-name">{res.profiles?.first_name} {res.profiles?.last_name}</div>
                              <div className="res-role">{res.profiles?.role}</div>
                            </div>
                          </div>
                          <div className="res-meta">
                            {res.is_confirmed && <span className="conf-badge"><CheckCircle2 className="w-3 h-3" /> Confirmed</span>}
                            <span className="res-date">{new Date(res.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        {res.message && <div className="res-body">{res.message}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-detail">
            <Activity className="w-16 h-16" style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
            <h2>Technical Events Management</h2>
            <p>Select an event to view details and acknowledgments, or create a new technical announcement.</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-form-container { 
          padding: 3rem; 
          height: 100%;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #e2e8f0 transparent;
        }
        .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; position: sticky; top: 0; background: white; z-index: 10; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9; }
        .form-header h2 { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; }
        .form-grid { display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1.5rem; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.625rem; }
        .form-group label { font-size: 0.85rem; font-weight: 700; color: #475569; }
        .form-group input, .form-group select, .form-group textarea {
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
          border: 2px solid #f1f5f9;
          font-size: 0.95rem;
          background: #ffffff;
          transition: all 0.2s;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
          background: white;
        }
        .form-footer { margin-top: 3rem; display: flex; justify-content: flex-end; gap: 1rem; padding-bottom: 2rem; }

        .event-detail-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
        .detail-header { padding: 2.5rem; background: #ffffff; border-bottom: 1px solid #f1f5f9; }
        .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .title-group h1 { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0.75rem 0 0; }
        .type-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.8rem; border-radius: 99px; font-size: 0.75rem; font-weight: 800; }
        .header-meta { display: flex; gap: 2rem; }
        .meta-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #64748b; font-weight: 600; }
        
        .detail-tabs { display: flex; background: #f8fafc; border-bottom: 1px solid #f1f5f9; padding: 0 2.5rem; }
        .detail-tab { padding: 1.25rem 2rem; font-size: 0.9rem; font-weight: 700; color: #64748b; cursor: pointer; border-bottom: 3px solid transparent; }
        .detail-tab.active { color: #4f46e5; border-bottom-color: #4f46e5; }
        
        .detail-content { flex: 1; overflow-y: auto; padding: 2.5rem; display: flex; flex-direction: column; gap: 3rem; }
        .content-section h3 { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin-bottom: 1.25rem; }
        .services-chips { display: flex; flex-wrap: wrap; gap: 0.75rem; }
        .service-chip { padding: 0.5rem 1rem; background: #f1f5f9; border-radius: 0.75rem; font-size: 0.85rem; font-weight: 700; color: #475569; }
        .technical-body { font-size: 1.05rem; line-height: 1.7; color: #334155; background: #fbfbfe; padding: 2rem; border-radius: 1.5rem; border: 1px solid #f1f5f9; }
        
        .responses-list { display: flex; flex-direction: column; gap: 1rem; }
        .response-card { background: white; border: 1px solid #f1f5f9; border-radius: 1.25rem; padding: 1.5rem; }
        .res-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .res-user { display: flex; gap: 1rem; align-items: center; }
        .res-avatar { width: 40px; height: 40px; border-radius: 12px; background: #eef2ff; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .res-name { font-weight: 700; color: #1e293b; font-size: 0.95rem; }
        .res-role { font-size: 0.75rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
        .conf-badge { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; font-weight: 800; color: #10b981; background: #ecfdf5; padding: 0.25rem 0.6rem; border-radius: 99px; }
        .res-body { color: #475569; font-size: 0.95rem; line-height: 1.5; padding-left: 3.5rem; }
      ` }} />
    </div>
  );
};

export default TechnicalEventManager;
