import React, { useState, useEffect, useCallback } from 'react';
import { 
  Star, MessageSquare, ThumbsUp, ThumbsDown, 
  AlertTriangle, Info, Lightbulb, Search, 
  Filter, CheckCircle2, Trash2, Loader2,
  Clock, Globe, ExternalLink, Activity,
  Users, Plus, X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

const FeedbackManager: React.FC = () => {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('portal_feedback')
      .select('*, profiles:user_id(first_name, last_name, email, role)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('type', filter as any);
    }

    const { data, error } = await query;
    if (error) toast.error('Failed to load feedback');
    else setFeedback(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase
      .from('portal_feedback')
      .update({ is_read: true })
      .eq('id', id);

    if (error) toast.error('Failed to update status');
    else {
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, is_read: true } : f));
      // toast.success('Marked as read');
    }
  };

  const handleToggleImplemented = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('portal_feedback')
      .update({ is_implemented: !current })
      .eq('id', id);

    if (error) toast.error('Failed to update implementation status');
    else {
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, is_implemented: !current } : f));
      setSelectedFeedback((prev: any) => ({ ...prev, is_implemented: !current }));
      toast.success(!current ? 'Marked as implemented' : 'Implementation status cleared');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return <Lightbulb className="w-4 h-4 text-amber-500" />;
      case 'complaint': return <ThumbsDown className="w-4 h-4 text-red-500" />;
      case 'compliment': return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case 'bug_report': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const filteredData = feedback.filter(f => 
    f.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.profiles?.first_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (f: any) => {
    setSelectedFeedback(f);
    if (!f.is_read) {
      handleMarkAsRead(f.id);
    }
  };

  return (
    <div className="ticket-admin-container" style={{ height: 'calc(100vh - 200px)' }}>
      <div className="ticket-admin-list" style={{ width: '450px' }}>
        <div className="list-header">
          <div className="search-box">
            <Search className="w-4 h-4 icon" />
            <input 
              placeholder="Search feedback..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="advanced-filters">
            <select className="mini-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="suggestion">Suggestions</option>
              <option value="complaint">Complaints</option>
              <option value="compliment">Compliments</option>
              <option value="bug_report">Bug Reports</option>
            </select>
            <button className="btn-refresh-list" onClick={fetchFeedback}><Activity className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="list-content">
          {loading ? (
            <div className="loading-state"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : filteredData.length === 0 ? (
            <div className="empty-state">No feedback found</div>
          ) : filteredData.map(f => (
            <div 
              key={f.id} 
              className={`ticket-item ${selectedFeedback?.id === f.id ? 'active' : ''} ${f.is_read ? 'read' : 'unread'}`} 
              onClick={() => handleSelect(f)}>
              <div className="item-meta">
                <span className="type-tag">{getTypeIcon(f.type)} {f.type.replace('_', ' ')}</span>
                <span className="rating-tag"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {f.rating}/5</span>
              </div>
              <h4 className="subject">{f.subject}</h4>
              <div className="item-footer">
                <span className="user">{f.profiles?.first_name} {f.profiles?.last_name}</span>
                <span className="time">{new Date(f.created_at).toLocaleDateString()}</span>
              </div>
              {!f.is_read && <div className="unread-dot" />}
              {f.is_implemented && <div className="implemented-indicator"><CheckCircle2 className="w-3 h-3" /> Implemented</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="ticket-admin-detail">
        {selectedFeedback ? (
          <div className="detail-wrapper">
            <div className="detail-header">
              <div className="header-info">
                <div className="type-badge">{getTypeIcon(selectedFeedback.type)} {selectedFeedback.type.replace('_', ' ')}</div>
                <h2>{selectedFeedback.subject}</h2>
                <div className="meta-row">
                  <span><Users className="w-3 h-3" /> {selectedFeedback.profiles?.first_name} {selectedFeedback.profiles?.last_name} ({selectedFeedback.profiles?.role})</span>
                  <span><Clock className="w-3 h-3" /> {new Date(selectedFeedback.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="header-actions">
                <button 
                  onClick={() => handleToggleImplemented(selectedFeedback.id, selectedFeedback.is_implemented)}
                  className={`btn-assign ${selectedFeedback.is_implemented ? 'implemented' : ''}`}
                >
                  {selectedFeedback.is_implemented ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {selectedFeedback.is_implemented ? 'Implemented' : 'Mark as Implemented'}
                </button>
                <button onClick={() => setSelectedFeedback(null)} className="btn-close-view"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="detail-body">
              <div className="feedback-content-card">
                <div className="rating-display">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-5 h-5 ${selectedFeedback.rating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  ))}
                  <span className="rating-text">{selectedFeedback.rating}/5 Rating</span>
                </div>
                <div className="message-box">
                  {selectedFeedback.message}
                </div>
                {selectedFeedback.page_url && (
                  <div className="url-ref">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Submitted on: </span>
                    <a href={selectedFeedback.page_url} target="_blank" rel="noreferrer">{selectedFeedback.page_url} <ExternalLink className="w-3 h-3" /></a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="detail-placeholder" style={{ padding: '4rem' }}>
            <div className="icon-pulse" style={{ background: '#fffbeb', color: '#f59e0b' }}><Star className="w-10 h-10" /></div>
            <h3>Portal Feedback Intelligence</h3>
            <p>Review suggestions and experiences from our agents to continuously improve the platform.</p>
            <div className="stats-mini">
              <div className="stat"><ThumbsUp className="w-3.5 h-3.5" /> <span>Improve Satisfaction</span></div>
              <div className="stat"><Lightbulb className="w-3.5 h-3.5" /> <span>Fuel Innovation</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackManager;
