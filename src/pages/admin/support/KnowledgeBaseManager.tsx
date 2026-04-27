import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit3, Trash2, BookOpen, Eye,
  Globe, Clock, ChevronRight, FileText, Folder,
  MoreVertical, ExternalLink, Loader2, Tag
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { KbArticleRow, KbCategoryRow } from '../../../types/database';
import toast from 'react-hot-toast';
import ArticleEditor from './ArticleEditor';

const KnowledgeBaseManager: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [categories, setCategories] = useState<KbCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [artRes, catRes] = await Promise.all([
        supabase.from('kb_articles').select('*, kb_categories(name, slug)').order('created_at', { ascending: false }),
        supabase.from('kb_categories').select('*').order('display_order')
      ]);
      setArticles(artRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      toast.error('Failed to load data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteArticle = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      const { error } = await supabase.from('kb_articles').delete().eq('id', id);
      if (error) throw error;
      setArticles(prev => prev.filter(a => a.id !== id));
      toast.success('Article deleted');
    } catch (err) {
      toast.error('Failed to delete article');
    }
  };

  const filteredArticles = articles.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory ? a.category_id === activeCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ height: 'calc(100vh - 280px)', background: 'white', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          <div className="search-box" style={{ maxWidth: '300px' }}>
            <Search className="w-4 h-4 icon" />
            <input 
              placeholder="Search articles..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            value={activeCategory || ''} 
            onChange={e => setActiveCategory(e.target.value || null)}
            style={{ padding: '0.625rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: 'white' }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={() => { setEditingArticle(null); setShowEditor(true); }}>
          <Plus className="w-4 h-4" /> Create Article
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" /></div>
        ) : filteredArticles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#334155' }}>No articles found</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Start by creating your first knowledge base article.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {filteredArticles.map(art => (
              <div key={art.id} style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: '1.25rem', padding: '1.5rem', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 32, height: 32, background: '#eef2ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', background: '#f8fafc', padding: '0.2rem 0.6rem', borderRadius: '0.5rem' }}>
                      {art.kb_categories?.name || 'Uncategorized'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => { setEditingArticle(art); setShowEditor(true); }} style={{ padding: '0.5rem', borderRadius: '0.5rem', background: '#f8fafc', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteArticle(art.id)} style={{ padding: '0.5rem', borderRadius: '0.5rem', background: '#fef2f2', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', lineHeight: 1.4 }}>{art.title}</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {art.excerpt || 'No description provided.'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f8fafc', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                      <Eye className="w-3.5 h-3.5" /> {art.view_count || 0}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                      <Globe className="w-3.5 h-3.5" /> {art.status}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>Updated {new Date(art.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEditor && (
        <ArticleEditor 
          article={editingArticle} 
          categories={categories}
          onClose={() => { setShowEditor(false); fetchData(); }} 
        />
      )}
    </div>
  );
};

export default KnowledgeBaseManager;
