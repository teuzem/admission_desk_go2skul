import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, ShieldAlert, Clock, CheckCircle2, 
  Plus, Search, Filter, MoreVertical, 
  Trash2, Edit, AlertTriangle, Activity,
  Globe, MessageSquare, Send, X,
  Paperclip, FileText, ImageIcon, Loader2, User,
  Upload, Image as ImageLucide
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { uploadTechnicalMedia } from '../../../lib/support';
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
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => { 
    fetchEvents(); 
    
    // Real-time subscriptions
    const eventsSubscription = supabase.channel('admin-technical-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technical_events' }, fetchEvents)
      .subscribe();

    const responsesSubscription = supabase.channel('admin-technical-responses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technical_event_responses' }, (payload) => {
        if (selectedEvent && payload.new && (payload.new as any).event_id === selectedEvent.id) {
          fetchResponses(selectedEvent.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(eventsSubscription);
      supabase.removeChannel(responsesSubscription);
    };
  }, [fetchEvents, selectedEvent]);

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

    setUploading(true);
    let uploadedUrls: string[] = [];
    try {
      if (mediaFiles.length > 0) {
        uploadedUrls = await Promise.all(mediaFiles.map(f => uploadTechnicalMedia(f)));
      }
    } catch (err) {
      toast.error('Failed to upload media files');
      setUploading(false);
      return;
    }

    const payload = {
      ...formData,
      created_by: userId,
      start_at: new Date(formData.start_at).toISOString(),
      end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
      media_urls: [...(selectedEvent?.media_urls || []), ...uploadedUrls]
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
        setMediaFiles([]);
        fetchEvents();
      }
    }
    setUploading(false);
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
            setMediaFiles([]);
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
                <div className="form-group">
                  <label>Attachments (Images, Documents)</label>
                  <div className="media-uploader-zone" onClick={() => document.getElementById('tech-media-upload')?.click()}>
                    <div className="upload-icon-wrap">
                      <Upload className="w-6 h-6 text-indigo-500" />
                    </div>
                    <span className="upload-text">Click to browse or drag and drop</span>
                    <span className="upload-hint">Support for images, PDFs, Word docs (Max 10MB)</span>
                  </div>
                  <input
                    id="tech-media-upload"
                    type="file"
                    multiple
                    hidden
                    accept="image/*,application/pdf,.doc,.docx"
                    onChange={e => {
                      if (e.target.files) {
                        setMediaFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                  />
                  {mediaFiles.length > 0 && (
                    <div className="media-preview-grid">
                      {mediaFiles.map((file, i) => (
                        <div key={i} className="media-preview-item">
                          {file.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(file)} alt="preview" />
                          ) : (
                            <div className="doc-preview"><FileText className="w-8 h-8 text-indigo-400" /></div>
                          )}
                          <button type="button" className="remove-media" onClick={() => setMediaFiles(prev => prev.filter((_, idx) => idx !== i))}>
                            <X className="w-3 h-3" />
                          </button>
                          <div className="media-name" title={file.name}>{file.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" disabled={uploading}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Announcement'}
                </button>
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

              {selectedEvent.media_urls && selectedEvent.media_urls.length > 0 && (
                <div className="content-section">
                  <h3>Attachments</h3>
                  <div className="event-attachments-grid">
                    {selectedEvent.media_urls.map((url, i) => {
                      const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
                      return (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="attachment-card">
                          {isImage ? (
                            <img src={url} alt={`attachment-${i}`} />
                          ) : (
                            <div className="doc-icon"><FileText className="w-8 h-8 text-indigo-400" /></div>
                          )}
                          <div className="attachment-link-overlay">
                            <span className="view-text">Click to view</span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

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
          <div className="empty-detail-premium">
            <div className="empty-detail-icon-box">
              <Activity className="w-12 h-12 text-indigo-500" />
              <div className="ping-dot"></div>
            </div>
            <h2>Technical Team Dashboard</h2>
            <p>Monitor system health, broadcast maintenance alerts, and track agent acknowledgments in real-time across the entire organization.</p>
            <div className="empty-detail-stats">
              <div className="stat-pill"><ShieldAlert className="w-4 h-4" /> Zero Critical Alerts</div>
              <div className="stat-pill"><CheckCircle2 className="w-4 h-4" /> Systems Operational</div>
            </div>
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

        .media-uploader-zone { border: 2px dashed #cbd5e1; border-radius: 1rem; padding: 2.5rem; text-align: center; cursor: pointer; transition: all 0.2s; background: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .media-uploader-zone:hover { border-color: #4f46e5; background: #eef2ff; }
        .upload-icon-wrap { width: 48px; height: 48px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .upload-text { font-size: 1rem; font-weight: 700; color: #334155; margin-bottom: 0.25rem; }
        .upload-hint { font-size: 0.8rem; color: #94a3b8; }
        .media-preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
        .media-preview-item { position: relative; width: 100%; aspect-ratio: 1; border-radius: 0.75rem; border: 1px solid #e2e8f0; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; flex-direction: column; }
        .media-preview-item img { width: 100%; height: 100%; object-fit: cover; }
        .remove-media { position: absolute; top: 0.35rem; right: 0.35rem; width: 22px; height: 22px; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; backdrop-filter: blur(4px); z-index: 2; }
        .remove-media:hover { background: #ef4444; }
        .media-name { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; font-size: 0.65rem; padding: 0.25rem; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; backdrop-filter: blur(4px); }
        .doc-preview { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f1f5f9; }

        .empty-detail-premium { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); text-align: center; padding: 3rem; }
        .empty-detail-icon-box { position: relative; width: 90px; height: 90px; background: white; border-radius: 2rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(79, 70, 229, 0.1); margin-bottom: 2rem; }
        .ping-dot { position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; background: #ef4444; border-radius: 50%; border: 3px solid white; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        .empty-detail-premium h2 { font-size: 1.85rem; font-weight: 800; color: #0f172a; margin-bottom: 1rem; }
        .empty-detail-premium p { font-size: 1.05rem; color: #64748b; max-width: 480px; line-height: 1.6; margin-bottom: 2.5rem; }
        .empty-detail-stats { display: flex; gap: 1rem; }
        .stat-pill { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: white; border: 1px solid #e2e8f0; border-radius: 99px; font-size: 0.85rem; font-weight: 700; color: #475569; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }

        .event-attachments-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem; margin-top: 1rem; }
        .attachment-card { position: relative; width: 100%; aspect-ratio: 1; border-radius: 0.75rem; border: 1px solid #e2e8f0; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s; }
        .attachment-card img { width: 100%; height: 100%; object-fit: cover; }
        .doc-icon { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f1f5f9; }
        .attachment-link-overlay { position: absolute; inset: 0; background: rgba(79, 70, 229, 0.8); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; backdrop-filter: blur(2px); }
        .attachment-card:hover .attachment-link-overlay { opacity: 1; }
        .view-text { color: white; font-weight: 700; font-size: 0.85rem; }
      ` }} />
    </div>
  );
};

export default TechnicalEventManager;
