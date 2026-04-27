import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, Clock, Calendar, User, Share2, 
  Printer, ArrowLeft, Bookmark, ThumbsUp, 
  MessageSquare, Loader2, Globe, FileText,
  ChevronRight, ExternalLink
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { KbArticleRow } from '../../../types/database';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';
import './SupportPages.css';

const KnowledgeBaseArticle: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [relatedArticles, setRelatedArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Fetch article data
  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('kb_articles')
        .select('*, kb_categories(name, slug, icon)')
        .eq('slug', slug)
        .eq('status', 'published' as any)
        .single();

      if (error || !data) {
        toast.error('Article not found');
        navigate('/dashboard/support');
        return;
      }

      setArticle(data);
      
      // Fetch author
      if (data.author_id) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', data.author_id)
          .single();
        if (userData) setAuthor(userData);
      }

      // Fetch related
      const { data: related } = await supabase
        .from('kb_articles')
        .select('title, slug, excerpt')
        .eq('category_id', data.category_id)
        .neq('id', data.id)
        .limit(3);
      setRelatedArticles(related || []);

      // Increment view count
      await (supabase.rpc as any)('increment_kb_view', { article_id: data.id });
      
      setLoading(false);
    };

    fetchArticle();
  }, [slug, navigate]);

  // Reading progress
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setScrollProgress(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const readingTime = useMemo(() => {
    if (!article?.content) return 1;
    const words = article.content.replace(/<[^>]*>?/gm, '').trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [article?.content]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  if (loading) {
    return (
      <div className="kb-reader-loading">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p>Opening Knowledge Base...</p>
      </div>
    );
  }

  return (
    <div className="kb-reader-root">
      {/* Scroll Progress Bar */}
      <div className="kb-reader-progress" style={{ width: `${scrollProgress}%` }} />

      {/* Floating Header */}
      <header className={`kb-reader-header ${scrollProgress > 5 ? 'scrolled' : ''}`}>
        <div className="kb-reader-header-inner">
          <Link to="/dashboard/support" className="kb-back-btn">
            <ArrowLeft className="w-5 h-5" /> <span>Back</span>
          </Link>
          <div className="kb-header-title">{article.title}</div>
          <div className="kb-header-actions">
            <button onClick={copyLink} title="Share"><Share2 className="w-4 h-4" /></button>
            <button onClick={() => window.print()} title="Print"><Printer className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="kb-reader-content">
        <div className="kb-reader-layout">
          {/* Main Article Body */}
          <article className="kb-article-body">
            {/* Breadcrumbs */}
            <nav className="kb-breadcrumbs">
              <Link to="/dashboard/support">Support</Link>
              <ChevronRight className="w-3 h-3" />
              <span>{article.kb_categories?.name}</span>
            </nav>

            {/* Title & Meta */}
            <header className="kb-article-title-section">
              <h1>{article.title}</h1>
              <div className="kb-article-meta">
                <div className="kb-meta-item">
                  <Clock className="w-4 h-4" /> {readingTime} min read
                </div>
                <div className="kb-meta-divider" />
                <div className="kb-meta-item">
                  <Calendar className="w-4 h-4" /> {new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="kb-meta-divider" />
                <div className="kb-meta-item">
                  <Globe className="w-4 h-4" /> {article.status.charAt(0).toUpperCase() + article.status.slice(1)}
                </div>
              </div>
            </header>

            {/* Featured Image */}
            {article.featured_image_url && (
              <div className="kb-featured-frame">
                <img src={article.featured_image_url} alt={article.title} />
              </div>
            )}

            {/* Actual Content Render */}
            <div 
              className="kb-article-render kb-rich-text" 
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }} 
            />

            {/* Feedback Footer */}
            <footer className="kb-article-footer">
              <div className="kb-feedback-box">
                <h3>Was this article helpful?</h3>
                <div className="kb-feedback-btns">
                  <button className="kb-feedback-btn"><ThumbsUp className="w-4 h-4" /> Yes</button>
                  <button className="kb-feedback-btn no"><MessageSquare className="w-4 h-4" /> No, suggest improvement</button>
                </div>
              </div>
            </footer>
          </article>

          {/* Sticky Sidebar */}
          <aside className="kb-reader-sidebar">
            <div className="kb-sidebar-card author-card">
              <div className="author-avatar">
                {author?.avatar_url ? <img src={author.avatar_url} alt="" /> : <User className="w-6 h-6" />}
              </div>
              <div className="author-info">
                <div className="author-label">Published By</div>
                <div className="author-name">{author ? `${author.first_name} ${author.last_name}` : 'Technical Team'}</div>
                <div className="author-title">Technical Specialist</div>
              </div>
            </div>

            <div className="kb-sidebar-card">
              <h4 className="sidebar-title">Article Information</h4>
              <div className="info-list">
                <div className="info-item">
                  <FileText className="w-4 h-4" />
                  <div>
                    <label>Category</label>
                    <p>{article.kb_categories?.name}</p>
                  </div>
                </div>
                {article.tags && article.tags.length > 0 && (
                  <div className="info-item">
                    <Bookmark className="w-4 h-4" />
                    <div>
                      <label>Tags</label>
                      <div className="kb-tag-cloud">
                        {article.tags.map((tag: string) => <span key={tag}>{tag}</span>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {relatedArticles.length > 0 && (
              <div className="kb-sidebar-card">
                <h4 className="sidebar-title">Related Content</h4>
                <div className="related-list">
                  {relatedArticles.map(rel => (
                    <Link key={rel.slug} to={`/dashboard/support/kb/${rel.slug}`} className="related-item">
                      <h6>{rel.title}</h6>
                      <p>{rel.excerpt?.substring(0, 60)}...</p>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Footer CTA */}
      <section className="kb-support-cta">
        <div className="kb-cta-inner">
          <h2>Still need help?</h2>
          <p>If this article didn't resolve your issue, please open a support ticket.</p>
          <button onClick={() => navigate('/dashboard/support')} className="btn-primary">Contact Technical Team</button>
        </div>
      </section>
    </div>
  );
};

export default KnowledgeBaseArticle;
