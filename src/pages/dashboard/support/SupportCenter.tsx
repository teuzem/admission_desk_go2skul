import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LifeBuoy, Search, BookOpen, MessageCircle, FileText,
  ExternalLink, ChevronRight, ArrowRight, HelpCircle,
  Plus, Clock, Loader2, AlertCircle, Folder,
  Send, Paperclip, X, Image as ImageIcon, CornerUpLeft,
  User, Shield, Info, Activity, ArrowLeft,
  Layers, ShieldAlert, Star
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { searchArticles, addTicketMessage } from '../../../lib/support';
import { KbArticleRow, KbCategoryRow, SupportTicketRow } from '../../../types/database';
import { TICKET_STATUSES, TICKET_PRIORITIES } from '../../../types/database-extended';
import CreateTicketModal from './CreateTicketModal';
import FeedbackModal from './FeedbackModal';
import TechnicalStatusView from './TechnicalStatusView';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './SupportPages.css';

const SupportCenter: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'docs' | 'tickets' | 'status'>('docs');
  const [categories, setCategories] = useState<KbCategoryRow[]>([]);
  const [articles, setArticles] = useState<KbArticleRow[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<KbArticleRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Thread state
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, artRes] = await Promise.all([
        supabase.from('kb_categories').select('*').order('display_order'),
        supabase.from('kb_articles').select('*, kb_categories(name, slug, icon)').eq('status', 'published').order('view_count', { ascending: false }).limit(10)
      ]);
      setCategories(catRes.data || []);
      setArticles(artRes.data || []);

      if (user) {
        const { data: tix } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        setTickets(tix || []);
      }
    } catch (err) {
      toast.error('Failed to load support data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to all user tickets
    const ticketSub = supabase.channel('agent-tickets-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(ticketSub); };
  }, [user, fetchData]);

  // Thread management
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

    // Subscribe to messages
    const messageSub = supabase.channel(`agent-thread-${selectedTicket.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_ticket_messages', filter: `ticket_id=eq.${selectedTicket.id}` }, 
        async (payload) => {
          const { data: sender } = await supabase.from('profiles').select('first_name, last_name, role, avatar_url').eq('id', payload.new.sender_id).single();
          setMessages(prev => [...prev, { ...payload.new, profiles: sender }]);
        }
      )
      .subscribe();

    // Subscribe to ticket status changes
    const statusSub = supabase.channel(`agent-ticket-status-${selectedTicket.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${selectedTicket.id}` }, 
        payload => setSelectedTicket((prev: any) => ({ ...prev, ...payload.new }))
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(messageSub);
      supabase.removeChannel(statusSub);
    };
  }, [selectedTicket?.id]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchArticles(searchQuery);
      setSearchResults(results);
    } catch { toast.error('Search failed'); }
    setSearching(false);
  };

  const openArticle = (article: any) => {
    navigate(`/dashboard/support/kb/${article.slug}`);
  };

  const handleReply = async () => {
    if (!reply.trim() && files.length === 0) return;
    if (!selectedTicket || !user) return;
    setIsReplying(true);
    try {
      await addTicketMessage(selectedTicket.id, reply, user.id, files, false);
      setReply('');
      setFiles([]);
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setIsReplying(false);
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
    <div className="min-h-screen bg-[#FBFBFE] pb-20">
      {/* Hero (Hidden if viewing ticket thread) */}
      {!selectedTicket && (
        <div className="support-hero">
          <div className="support-hero-badge"><LifeBuoy className="w-4 h-4" /> Admission Desk Support Hub</div>
          <h1>How can we <span>help you</span> today?</h1>
          <p>Search our documentation or contact our technical team for assistance.</p>
          <div className="support-search-wrap">
            <Search />
            <input
              className="support-search-input"
              placeholder="Search articles, guides, or issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="support-search-btn" onClick={handleSearch}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6">
        {/* Main Navigation (Hidden if viewing ticket thread) */}
        {!selectedTicket && (
          <div className="support-tabs">
            <button className={`support-tab ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>
              <BookOpen className="w-5 h-5" /> Documentation
            </button>
            <button className={`support-tab ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>
              <MessageCircle className="w-5 h-5" /> My Tickets {tickets.length > 0 && <span className="tab-count">{tickets.filter(t => t.status !== 'closed').length}</span>}
            </button>
            <button className={`support-tab ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>
              <Activity className="w-5 h-5" /> System Status
            </button>
          </div>
        )}

        {/* Documentation Content */}
        {activeTab === 'docs' && !selectedTicket && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2.5rem' }}>
            <div>
              {/* Search Results / Category Results */}
              {(searchResults.length > 0 || selectedCategory) && (
                <div style={{ marginBottom: '2.5rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ width: 6, height: 24, background: '#4f46e5', borderRadius: 4 }} /> 
                      {selectedCategory ? 'Category Articles' : 'Search Results'}
                    </h2>
                    <button className="btn-secondary btn-sm" onClick={() => { setSearchResults([]); setSelectedCategory(null); setSearchQuery(''); }}>Back to All</button>
                  </div>
                  <div className="ticket-list">
                    {(searchResults.length > 0 ? searchResults : []).map((art: any) => (
                      <div key={art.id} className="ticket-card" onClick={() => openArticle(art)}>
                        <div className="ticket-card-header">
                          <h4>{art.title}</h4>
                          <ChevronRight className="w-4 h-4 opacity-30" />
                        </div>
                        {art.excerpt && <p className="art-excerpt">{art.excerpt}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories Grid */}
              {!selectedCategory && searchResults.length === 0 && (
                <>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ width: 6, height: 24, background: '#4f46e5', borderRadius: 4 }} /> Browse Categories
                  </h2>
                  <div className="support-categories">
                    {categories.map(cat => (
                      <div key={cat.id} className="support-cat-card" onClick={() => setSelectedCategory(cat.id)}>
                        <div className="support-cat-icon">
                          <Folder className="w-6 h-6" />
                        </div>
                        <h3>{cat.name}</h3>
                        <p>{cat.description || 'Explore related help articles'}</p>
                        <div className="support-cat-link">View Documentation <ChevronRight className="w-4 h-4" /></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="support-sidebar">
              {/* Quick Actions */}
              <div className="sidebar-card quick-actions">
                <h3><Activity className="w-5 h-5" /> Quick Actions</h3>
                <div className="quick-action-grid">
                  <button onClick={() => setShowCreateModal(true)}>
                    <div className="qa-icon"><Plus className="w-4 h-4" /></div>
                    <span>New Ticket</span>
                  </button>
                  <button onClick={() => setActiveTab('tickets')}>
                    <div className="qa-icon"><MessageCircle className="w-4 h-4" /></div>
                    <span>My History</span>
                  </button>
                  <button onClick={() => navigate('/dashboard/profile')}>
                    <div className="qa-icon"><User className="w-4 h-4" /></div>
                    <span>Profile Info</span>
                  </button>
                  <button onClick={() => window.open('mailto:support@admissiondesk.online')}>
                    <div className="qa-icon"><Send className="w-4 h-4" /></div>
                    <span>Email Us</span>
                  </button>
                </div>
              </div>

              {/* Popular Articles */}
              <div className="sidebar-card">
                <h3><FileText className="w-5 h-5" /> Popular Articles</h3>
                <div className="support-article-list">
                  {articles.length > 0 ? articles.map(art => (
                    <div key={art.id} className="support-article-item" onClick={() => openArticle(art)}>
                      <div className="art-dot" />
                      <span>{art.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 item-arrow" />
                    </div>
                  )) : (
                    <p className="no-data">No popular articles yet.</p>
                  )}
                </div>
              </div>

              {/* Pro Tips */}
              <div className="sidebar-card pro-tips">
                <div className="pro-tip-badge">PRO TIP</div>
                <h3>Master the Portal</h3>
                <p>Use keyboard shortcuts <strong>Ctrl + K</strong> to search anywhere in the portal instantly.</p>
                <div className="tip-footer">
                  <span>Learn more</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Feedback Promo */}
              <div className="sidebar-card feedback-promo">
                <h3><Star className="w-5 h-5 text-amber-500" /> Share Feedback</h3>
                <p>Enjoying the portal? Or have ideas for improvements? We'd love to hear from you.</p>
                <button className="btn-feedback" onClick={() => setShowFeedbackModal(true)}>
                  Give Feedback <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* System Status */}
              <div className="support-status-card">
                <div className="status-header">
                  <div className="status-icon-wrap">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3>System Status</h3>
                    <div className="status-indicator">
                      <span className="pulse-dot" /> Operational
                    </div>
                  </div>
                </div>
                <p>All core services are performing at peak efficiency. No issues reported.</p>
                <div className="status-details">
                  <div className="stat-row"><span>Backend API</span> <span className="stat-val">99.9%</span></div>
                  <div className="stat-row"><span>Document Store</span> <span className="stat-val">Online</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Technical Status Content */}
        {activeTab === 'status' && !selectedTicket && <TechnicalStatusView />}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && !selectedTicket && (
          <div className="agent-ticket-manager">
            <div className="ticket-manager-header">
              <div className="header-text">
                <h2>Technical Support Requests</h2>
                <p>Manage and track your assistance requests in real-time.</p>
              </div>
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4" /> New Technical Ticket
              </button>
            </div>

            {/* Advanced Filters */}
            <div className="ticket-filters-bar">
              <div className="filter-search">
                <Search className="w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Filter by subject or ticket ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="filter-selects">
                <div className="filter-group">
                  <Layers className="w-4 h-4" />
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="all">All Statuses</option>
                    {TICKET_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <ShieldAlert className="w-4 h-4" />
                  <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                    <option value="all">All Priorities</option>
                    {TICKET_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            
            {tickets.length === 0 ? (
              <div className="empty-tickets">
                <div className="empty-icon"><MessageCircle className="w-10 h-10" /></div>
                <h3>No active support requests</h3>
                <p>All your technical support requests and their progress will appear here.</p>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>Submit your first ticket</button>
              </div>
            ) : (
              <div className="ticket-grid-view">
                {tickets.filter(t => {
                  const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       (t.ticket_number && t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()));
                  const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
                  const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
                  return matchesSearch && matchesStatus && matchesPriority;
                }).map(ticket => {
                  const sm = getStatusMeta(ticket.status);
                  const pm = getPriorityMeta(ticket.priority);
                  return (
                    <div key={ticket.id} className="premium-ticket-card" onClick={() => setSelectedTicket(ticket)}>
                      <div className="card-top">
                        <div className="ticket-id">#{ticket.ticket_number || ticket.id.substring(0, 8)}</div>
                        <span className="priority-indicator" style={{ background: pm.bg, color: pm.color }}>{pm.label}</span>
                      </div>
                      <h4 className="card-subject">{ticket.subject}</h4>
                      <p className="card-excerpt">{ticket.description?.substring(0, 100)}...</p>
                      
                      <div className="card-footer">
                        <div className="footer-meta">
                          <div className="meta-item">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                          </div>
                          {ticket.attachments?.length > 0 && (
                            <div className="meta-item">
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>{ticket.attachments.length}</span>
                            </div>
                          )}
                        </div>
                        <div className="status-pill" style={{ background: sm.bg, color: sm.color }}>
                          <span className="dot" style={{ background: sm.color }} />
                          {sm.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Ticket Thread View */}
        {selectedTicket && (
          <div className="ticket-thread-view">
            <div className="thread-header">
              <button className="btn-back" onClick={() => setSelectedTicket(null)}>
                <ArrowLeft className="w-4 h-4" /> Back to Tickets
              </button>
              <div className="thread-title-area">
                <div className="id-tag">#{selectedTicket.ticket_number || selectedTicket.id.substring(0, 8)}</div>
                <h2>{selectedTicket.subject}</h2>
                <div className="thread-meta">
                  <span className="status-chip" style={{ background: getStatusMeta(selectedTicket.status).bg, color: getStatusMeta(selectedTicket.status).color }}>
                    {getStatusMeta(selectedTicket.status).label}
                  </span>
                  <span>•</span>
                  <span>Category: {selectedTicket.category.replace('_', ' ')}</span>
                  <span>•</span>
                  <span>Reported on {new Date(selectedTicket.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="thread-body">
              <div className="thread-messages">
                {/* Initial Description */}
                <div className="message-node system">
                  <div className="node-icon"><Info className="w-4 h-4" /></div>
                  <div className="node-content">
                    <div className="msg-header">Original Request</div>
                    <p>{selectedTicket.description}</p>
                    {selectedTicket.attachments?.length > 0 && (
                      <div className="att-grid">
                        {selectedTicket.attachments.map((att: any, i: number) => (
                          <a key={i} href={att.url} target="_blank" rel="noreferrer" className="att-item">
                            <ImageIcon className="w-3 h-3" /> {att.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Conversation */}
                {messages.map(m => {
                  const isMe = m.sender_id === user?.id;
                  const isAdmin = m.profiles?.role === 'admin' || m.profiles?.role === 'super_admin';
                  return (
                    <div key={m.id} className={`message-node ${isMe ? 'out' : 'in'} ${isAdmin ? 'admin-msg' : ''}`}>
                      <div className="node-avatar">
                        {m.profiles?.avatar_url ? <img src={m.profiles.avatar_url} alt="" /> : (isAdmin ? 'A' : 'U')}
                      </div>
                      <div className="node-content">
                        <div className="msg-header">
                          {isAdmin ? 'Technical Support Team' : 'You'} • {new Date(m.created_at).toLocaleTimeString()}
                        </div>
                        <p>{m.message}</p>
                        {m.attachments?.length > 0 && (
                          <div className="att-grid">
                            {m.attachments.map((att: any, i: number) => (
                              <a key={i} href={att.url} target="_blank" rel="noreferrer" className="att-item">
                                <FileText className="w-3 h-3" /> {att.name}
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

            <div className="thread-footer">
              {files.length > 0 && (
                <div className="pending-att">
                  {files.map((f, i) => (
                    <div key={i} className="pending-chip">
                      <span className="name">{f.name}</span>
                      <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="reply-box">
                <button className="tool-btn" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-5 h-5" /></button>
                <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileChange} />
                <textarea 
                  placeholder="Type your message to the technical team..." 
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleReply())}
                  disabled={selectedTicket.status === 'closed'}
                />
                <button 
                  className="send-btn" 
                  onClick={handleReply} 
                  disabled={isReplying || (!reply.trim() && files.length === 0) || selectedTicket.status === 'closed'}>
                  {isReplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              {selectedTicket.status === 'closed' && (
                <div className="closed-notice">This ticket is closed and no longer accepting replies.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && <CreateTicketModal onClose={() => setShowCreateModal(false)} />}
      {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(false)} />}
    </div>
  );
};

export default SupportCenter;
