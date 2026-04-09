import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, Newspaper, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ShareButtons from '../../components/common/ShareButtons'
import './NewsArticlePage.css'

type NewsPost = {
  id: string; title: string; content: string | null; image_url: string | null;
  category: string | null; is_published: boolean; published_at: string;
  created_by: string | null; created_at: string
}

export default function NewsArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<NewsPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [related, setRelated] = useState<NewsPost[]>([])

  const readingTime = (text: string | null) => {
    if (!text) return '1 min'
    return `${Math.max(1, Math.ceil(text.split(/\s+/).length / 200))} min read`
  }

  const fetchPost = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    const query = supabase.from('news_posts').select('*').eq('is_published', true)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug || '');
    // @ts-ignore - Supabase type instantiation workaround
    const { data } = await (isUUID ? query.eq('id', slug as string) : query.eq('slug', slug as string)).single();

    if (data) {
      setPost(data)
      const { data: rel } = await supabase.from('news_posts').select('*')
        .eq('is_published', true).neq('id', data.id).order('published_at', { ascending: false }).limit(4)
      if (rel) setRelated(rel)
    }
    setLoading(false)
  }, [slug])

  useEffect(() => { fetchPost() }, [fetchPost])

  if (loading) return (
    <div className="news-article-loading">
      <Loader2 size={32} className="spinning" />
      <p>Loading news...</p>
    </div>
  )

  if (!post) return (
    <div className="news-article-loading">
      <Newspaper size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
      <h3>Article not found</h3>
      <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Dashboard</Link>
    </div>
  )

  return (
    <div className="news-article-page">
      <Link to="/dashboard" className="news-back-link"><ArrowLeft size={16} /> Back to Dashboard</Link>

      <div className="news-article-hero" style={{ backgroundImage: post.image_url ? `url(${post.image_url})` : `linear-gradient(135deg, #3A4391, #1e2560)` }}>
        <div className="news-article-hero-overlay">
          {post.category && <span className="news-article-cat">{post.category}</span>}
          <h1 className="news-article-title">{post.title}</h1>
          <div className="news-article-meta">
            <span><Calendar size={14} /> {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span><Clock size={14} /> {readingTime(post.content)}</span>
          </div>
        </div>
      </div>

      <div className="news-article-layout">
        <article className="news-article-content">
          {post.content ? (
            <div className="news-prose" dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br/>') }} />
          ) : (
            <p style={{ color: '#94a3b8' }}>No content available.</p>
          )}
          <div className="news-share-bar" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
            <ShareButtons url={window.location.href} title={post.title} />
          </div>
        </article>

        {related.length > 0 && (
          <aside className="news-article-sidebar">
            <div className="news-related">
              <h4>Related News</h4>
              {related.map(r => (
                <Link key={r.id} to={`/dashboard/news/${(r as any).slug || r.id}`} className="news-related-card">
                  <div className="news-related-img" style={{ backgroundImage: r.image_url ? `url(${r.image_url})` : 'linear-gradient(135deg, #3A4391, #1e2560)' }} />
                  <div>
                    <h5>{r.title}</h5>
                    <span>{new Date(r.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
