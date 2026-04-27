import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Filter, Clock, MessageSquare, User, Ticket,
  AlertCircle, CheckCircle2, ChevronRight, X,
  Send, Paperclip, ExternalLink, MoreVertical,
  Shield, UserCheck, Trash2, Loader2, Image as ImageIcon,
  FileText, CornerUpLeft, Info, Activity
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { updateTicketStatus, addTicketMessage, assignTicket } from '../../../lib/support';
import { TICKET_STATUSES, TICKET_PRIORITIES } from '../../../types/database-extended';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const TicketManager: React.FC = () => {
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activePriority, setActivePriority] = useState('all');
  const [activeAssignment, setActiveAssignment] = useState('all'); // all, unassigned, assigned_me
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('support_tickets')
      .select('*, profiles:user_id(first_name, last_name, email, agency_name)')
      .order('updated_at', { ascending: false });

    if (activeFilter !== 'all') {
      query = query.eq('status', activeFilter as any);
    }

    if (activePriority !== 'all') {
      query = query.eq('priority', activePriority as any);
    }

    if (activeAssignment === 'unassigned') {
      query = query.is('assigned_to', null);
    } else if (activeAssignment === 'assigned_me') {
      query = query.eq('assigned_to', user?.id);
    }

    if (searchQuery) {
      query = query.or(`subject.ilike.%${searchQuery}%,ticket_number.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) toast.error('Failed to load tickets');
    else setTickets(data || []);
    setLoading(false);
  }, [activeFilter, activePriority, activeAssignment, searchQuery, user?.id]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    if (!selectedTicket) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('support_ticket_messages')
        .select('*, profiles:sender_id(first_name, last_name, role, avatar_url)')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();

    // Subscribe to ticket changes
    const ticketSub = supabase.channel(`ticket-update-${selectedTicket.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${selectedTicket.id}` }, 
        payload => setSelectedTicket((prev: any) => ({ ...prev, ...payload.new }))
      )
      .subscribe();

    // Subscribe to new messages
    const messageSub = supabase.channel(`ticket-msgs-${selectedTicket.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_ticket_messages', filter: `ticket_id=eq.${selectedTicket.id}` }, 
        async (payload) => {
          const { data: sender } = await supabase.from('profiles').select('first_name, last_name, role, avatar_url').eq('id', payload.new.sender_id).single();
          setMessages(prev => [...prev, { ...payload.new, profiles: sender }]);
        }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(ticketSub);
      supabase.removeChannel(messageSub);
    };
  }, [selectedTicket?.id]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [isInternal, setIsInternal] = useState(false);

  const handleReply = async () => {
    if (!reply.trim() && files.length === 0) return;
    if (!selectedTicket || !user) return;
    setIsReplying(true);
    try {
      await addTicketMessage(selectedTicket.id, reply, user.id, files, isInternal);
      setReply('');
      setFiles([]);
      setIsInternal(false);
      toast.success(isInternal ? 'Internal note added' : 'Reply sent');
    } catch (err) {
      toast.error('Failed to send reply');
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedTicket) return;
    try {
      const updated = await updateTicketStatus(selectedTicket.id, status);
      setSelectedTicket(updated);
      fetchTickets();
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicket || !user) return;
    try {
      const updated = await assignTicket(selectedTicket.id, user.id);
      setSelectedTicket(updated);
      fetchTickets();
      toast.success('Ticket assigned to you');
    } catch (err) {
      toast.error('Failed to assign ticket');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const getStatusMeta = (s: string) => TICKET_STATUSES.find(x => x.value === s) || TICKET_STATUSES[0];
  const getPriorityMeta = (p: string) => TICKET_PRIORITIES.find(x => x.value === p) || TICKET_PRIORITIES[1];

  return (
    <div className="ticket-admin-container">
      {/* Sidebar List */}
      <div className="ticket-admin-list">
        <div className="list-header">
          <div className="search-box">
            <Search className="w-4 h-4 icon" />
            <input 
              placeholder="Search by ID or Subject..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="advanced-filters">
            <div className="filter-row">
              <select className="mini-select" value={activeFilter} onChange={e => setActiveFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                {TICKET_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select className="mini-select" value={activePriority} onChange={e => setActivePriority(e.target.value)}>
                <option value="all">All Priorities</option>
                {TICKET_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="filter-row">
              <select className="mini-select" value={activeAssignment} onChange={e => setActiveAssignment(e.target.value)}>
                <option value="all">All Assignments</option>
                <option value="unassigned">Unassigned</option>
                <option value="assigned_me">Assigned to Me</option>
              </select>
              <button className="btn-refresh-list" onClick={fetchTickets}><Activity className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>

        <div className="list-content">
          {loading ? (
            <div className="loading-state"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">No tickets matched your search</div>
          ) : tickets.map(t => {
            const sm = getStatusMeta(t.status);
            const pm = getPriorityMeta(t.priority);
            const isActive = selectedTicket?.id === t.id;
            return (
              <div 
                key={t.id} 
                onClick={() => setSelectedTicket(t)}
                className={`ticket-item ${isActive ? 'active' : ''}`}>
                <div className="item-meta">
                  <span className="ticket-num">#{t.ticket_number || t.id.substring(0, 8)}</span>
                  <span className="priority" style={{ color: pm.color }}>{pm.label}</span>
                </div>
                <h4 className="subject">{t.subject}</h4>
                <div className="item-footer">
                  <span className="status-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                  <span className="time">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
                {t.assigned_to === user?.id && <div className="assigned-me-indicator">Assigned to you</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="ticket-admin-detail">
        {selectedTicket ? (
          <div className="detail-wrapper">
            <div className="detail-header">
              <div className="header-info">
                <div className="id-badge">#{selectedTicket.ticket_number || selectedTicket.id.substring(0, 8)}</div>
                <h2>{selectedTicket.subject}</h2>
                <div className="meta-row">
                  <span><User className="w-3 h-3" /> {selectedTicket.profiles?.first_name} {selectedTicket.profiles?.last_name}</span>
                  <span><Shield className="w-3 h-3" /> {selectedTicket.category.replace('_', ' ')}</span>
                  <span><Clock className="w-3 h-3" /> {new Date(selectedTicket.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="header-actions">
                <select 
                  value={selectedTicket.status} 
                  onChange={e => handleStatusChange(e.target.value)}
                  className="status-select">
                  {TICKET_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {!selectedTicket.assigned_to ? (
                  <button onClick={handleAssignToMe} className="btn-assign">Assign to Me</button>
                ) : (
                  <div className="assignee-tag">
                    <UserCheck className="w-3.5 h-3.5" /> 
                    {selectedTicket.assigned_to === user?.id ? 'Assigned to you' : 'Assigned to Team'}
                  </div>
                )}
                <button onClick={() => setSelectedTicket(null)} className="btn-close-view"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="detail-body">
              <div className="thread-scroller">
                {/* Original Issue */}
                <div className="message-node system-start">
                  <div className="node-icon"><Info className="w-4 h-4" /></div>
                  <div className="node-content">
                    <div className="content-header">Initial Report from Agent</div>
                    <p>{selectedTicket.description}</p>
                    {selectedTicket.attachments && (selectedTicket.attachments as any[]).length > 0 && (
                      <div className="attachment-grid">
                        {(selectedTicket.attachments as any[]).map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noreferrer" className="att-link">
                            <ExternalLink className="w-3 h-3" /> {att.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Conversation */}
                {messages.map(m => {
                  const isMe = m.sender_id === user?.id;
                  const isAgent = m.profiles?.role !== 'admin' && m.profiles?.role !== 'super_admin';
                  return (
                    <div key={m.id} className={`message-node ${isMe ? 'out' : 'in'} ${m.is_internal ? 'internal' : ''}`}>
                      <div className="node-avatar">
                        {m.profiles?.avatar_url ? <img src={m.profiles.avatar_url} alt="" /> : (isAgent ? 'U' : 'A')}
                      </div>
                      <div className="node-content">
                        <div className="content-header">
                          {m.profiles?.first_name || 'System'} 
                          {m.is_internal && <span className="internal-badge"><Shield className="w-2.5 h-2.5" /> Internal Note</span>}
                          • {new Date(m.created_at).toLocaleTimeString()}
                        </div>
                        <p>{m.message}</p>
                        {m.attachments && (m.attachments as any[]).length > 0 && (
                          <div className="attachment-grid">
                            {(m.attachments as any[]).map((att: any, i: number) => (
                              <a key={i} href={att.url} target="_blank" rel="noreferrer" className="att-link">
                                {att.type?.startsWith('image/') ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                {att.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>
            </div>

            <div className="detail-footer">
              <div className="reply-options">
                <div className="toggle-group">
                  <button 
                    onClick={() => setIsInternal(false)}
                    className={`toggle-btn ${!isInternal ? 'active' : ''}`}>
                    <MessageSquare className="w-3.5 h-3.5" /> Public Reply
                  </button>
                  <button 
                    onClick={() => setIsInternal(true)}
                    className={`toggle-btn internal ${isInternal ? 'active' : ''}`}>
                    <Shield className="w-3.5 h-3.5" /> Internal Note
                  </button>
                </div>
              </div>

              {files.length > 0 && (
                <div className="pending-attachments">
                  {files.map((f, i) => (
                    <div key={i} className="pending-chip">
                      <FileText className="w-3 h-3" />
                      <span>{f.name}</span>
                      <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className={`reply-container ${isInternal ? 'is-internal' : ''}`}>
                <button className="btn-util" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  multiple 
                  hidden 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                />
                <textarea 
                  placeholder={isInternal ? "Add a private technical note..." : "Type a professional response..."}
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleReply())}
                />
                <button 
                  onClick={handleReply} 
                  disabled={isReplying || (!reply.trim() && files.length === 0)}
                  className="btn-send">
                  {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="detail-placeholder">
            <div className="icon-pulse"><Ticket className="w-10 h-10" /></div>
            <h3>Command Center</h3>
            <p>Select an active ticket from the sidebar to start a resolution thread.</p>
            <div className="stats-mini">
              <div className="stat"><Activity className="w-3.5 h-3.5" /> <span>Real-time Sync Active</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketManager;
