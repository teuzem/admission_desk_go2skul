import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Clock, User, Tag, Heart, MessageCircle,
  BookOpen, Send, ThumbsUp, Sparkles, HandMetal, Loader2, X
} from 'lucide-react'
import ShareButtons from '../../components/common/ShareButtons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import './BlogArticlePage.css'

type BlogPost = {
  id: string; title: string; slug: string | null; content: string | null;
  excerpt: string | null; featured_image_url: string | null; category: string | null;
  tags: string[] | null; is_published: boolean; published_at: string;
  created_by: string | null; created_at: string
}

type Comment = {
  id: string; blog_post_id: string; user_id: string; parent_id: string | null;
  content: string; created_at: string; updated_at: string;
  profiles?: { first_name: string | null; last_name: string | null; avatar_url: string | null }
}

type Reaction = { reaction_type: string; count: number; hasReacted: boolean }

const REACTIONS = [
  { type: 'like', icon: <ThumbsUp size={16} />, label: 'Like' },
  { type: 'love', icon: <Heart size={16} />, label: 'Love' },
  { type: 'insightful', icon: <Sparkles size={16} />, label: 'Insightful' },
  { type: 'clap', icon: <HandMetal size={16} />, label: 'Clap' },
]

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [author, setAuthor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<Comment[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [related, setRelated] = useState<any[]>([])

  const readingTime = (text: string | null) => {
    if (!text) return '1 min'
    const words = text.split(/\s+/).length
    return `${Math.max(1, Math.ceil(words / 200))} min read`
  }

  const fetchPost = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    // Try by slug first, then by id
    let { data } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('is_published', true).single()
    if (!data) {
      const res = await supabase.from('blog_posts').select('*').eq('id', slug).eq('is_published', true).single()
      data = res.data
    }
    if (data) {
      setPost(data)
      if (data.created_by) {
        const { data: profile } = await supabase.from('profiles').select('first_name, last_name, avatar_url').eq('id', data.created_by).single()
        setAuthor(profile)
      }
      // Fetch related
      const { data: rel } = await supabase.from('blog_posts').select('id, title, slug, excerpt, featured_image_url, category, published_at')
        .eq('is_published', true).neq('id', data.id).limit(3)
      if (rel) setRelated(rel)
    }
    setLoading(false)
  }, [slug])

  const fetchComments = useCallback(async () => {
    if (!post) return
    const { data } = await supabase.from('blog_comments')
      .select('*, profiles(first_name, last_name, avatar_url)')
      .eq('blog_post_id', post.id)
      .order('created_at', { ascending: true })
    if (data) setComments(data as any)
  }, [post?.id])

  const fetchReactions = useCallback(async () => {
    if (!post) return
    const results: Reaction[] = []
    for (const r of REACTIONS) {
      const { count } = await supabase.from('blog_reactions').select('id', { count: 'exact', head: true })
        .eq('blog_post_id', post.id).eq('reaction_type', r.type as any)
      let hasReacted = false
      if (user) {
        const { data } = await supabase.from('blog_reactions').select('id')
          .eq('blog_post_id', post.id).eq('user_id', user.id).eq('reaction_type', r.type as any)
        hasReacted = (data || []).length > 0
      }
      results.push({ reaction_type: r.type, count: count || 0, hasReacted })
    }
    setReactions(results)
  }, [post?.id, user?.id])

  useEffect(() => { fetchPost() }, [fetchPost])
  useEffect(() => { if (post) { fetchComments(); fetchReactions() } }, [post, fetchComments, fetchReactions])

  useEffect(() => {
    if (!post) return
    const ch = supabase.channel(`blog-${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_comments', filter: `blog_post_id=eq.${post.id}` }, fetchComments)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_reactions', filter: `blog_post_id=eq.${post.id}` }, fetchReactions)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [post?.id])

  const handleReaction = async (type: string) => {
    if (!user || !post) return

    // Optimistic UI Update
    setReactions(prev => prev.map(r => {
      if (r.reaction_type === type) {
        return {
          ...r,
          hasReacted: !r.hasReacted,
          count: r.hasReacted ? Math.max(0, r.count - 1) : r.count + 1
        }
      }
      return r
    }))

    try {
      const existing = reactions.find(r => r.reaction_type === type)
      if (existing?.hasReacted) {
        await supabase.from('blog_reactions').delete()
          .eq('blog_post_id', post.id)
          .eq('user_id', user.id)
          .eq('reaction_type', type as any)
      } else {
        await supabase.from('blog_reactions').insert({ 
          blog_post_id: post.id, 
          user_id: user.id, 
          reaction_type: type 
        } as any)
      }
      // Realtime subscription handles the truth sync on success
    } catch (error) {
      console.error("Error setting reaction:", error)
      // Revert optimism if it fails
      fetchReactions()
    }
  }

  const submitComment = async (parentId: string | null = null) => {
    if (!user || !post) return
    const text = parentId ? replyText : newComment
    if (!text.trim()) return
    setSubmitting(true)
    await supabase.from('blog_comments').insert({
      blog_post_id: post.id, user_id: user.id, parent_id: parentId, content: text.trim()
    })
    if (parentId) { setReplyText(''); setReplyTo(null) } else setNewComment('')
    setSubmitting(false)
    fetchComments()
  }

  const topComments = comments.filter(c => !c.parent_id)
  const getReplies = (id: string) => comments.filter(c => c.parent_id === id)

  if (loading) return (
    <div className="blog-article-loading">
      <Loader2 size={32} className="spinning" />
      <p>Loading article...</p>
    </div>
  )

  if (!post) return (
    <div className="blog-article-loading">
      <BookOpen size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
      <h3>Article not found</h3>
      <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Dashboard</Link>
    </div>
  )

  return (
    <div className="blog-article-page">
      <Link to="/dashboard" className="blog-back-link"><ArrowLeft size={16} /> Back to Dashboard</Link>

      {/* Hero */}
      <div className="blog-article-hero" style={{ backgroundImage: post.featured_image_url ? `url(${post.featured_image_url})` : `linear-gradient(135deg, #1e293b, #334155)` }}>
        <div className="blog-article-hero-overlay">
          {post.category && <span className="blog-article-cat">{post.category}</span>}
          <h1 className="blog-article-title">{post.title}</h1>
          <div className="blog-article-meta">
            {author && (
              <span className="blog-meta-item">
                {author.avatar_url ? <img src={author.avatar_url} alt="" className="blog-author-avatar" /> : <User size={14} />}
                {author.first_name} {author.last_name}
              </span>
            )}
            <span className="blog-meta-item"><Calendar size={14} /> {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="blog-meta-item"><Clock size={14} /> {readingTime(post.content)}</span>
          </div>
        </div>
      </div>

      <div className="blog-article-layout">
        <article className="blog-article-content">
          {post.content ? (
            <div className="blog-prose" dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br/>') }} />
          ) : (
            <p style={{ color: '#94a3b8' }}>No content available.</p>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="blog-tags">
              <Tag size={14} />
              {post.tags.map(tag => <span key={tag} className="blog-tag">{tag}</span>)}
            </div>
          )}

          {/* Reactions */}
          <div className="blog-reactions-bar">
            {REACTIONS.map(r => {
              const data = reactions.find(x => x.reaction_type === r.type)
              return (
                <button key={r.type} className={`blog-reaction-btn ${data?.hasReacted ? 'active' : ''}`} onClick={() => handleReaction(r.type)}>
                  {r.icon} <span>{data?.count || 0}</span>
                </button>
              )
            })}
            <div style={{ marginLeft: 'auto' }}>
              <ShareButtons url={window.location.href} title={post.title} />
            </div>
          </div>

          {/* Comments */}
          <div className="blog-comments-section">
            <h3><MessageCircle size={20} /> Comments ({comments.length})</h3>

            {user && (
              <div className="blog-comment-form">
                <textarea placeholder="Write a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} rows={3} />
                <button className="btn btn-primary btn-sm" onClick={() => submitComment()} disabled={submitting || !newComment.trim()}>
                  {submitting ? <Loader2 size={14} className="spinning" /> : <Send size={14} />} Post Comment
                </button>
              </div>
            )}

            <div className="blog-comments-list">
              {topComments.map(comment => (
                <div key={comment.id} className="blog-comment">
                  <div className="blog-comment-header">
                    <div className="blog-comment-avatar">
                      {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} alt="" /> : <User size={16} />}
                    </div>
                    <div>
                      <strong>{comment.profiles?.first_name || 'User'} {comment.profiles?.last_name || ''}</strong>
                      <span className="blog-comment-time">{new Date(comment.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at {new Date(comment.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <p className="blog-comment-text">{comment.content}</p>
                  <button className="blog-reply-btn" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>
                    <MessageCircle size={12} /> Reply
                  </button>

                  {replyTo === comment.id && user && (
                    <div className="blog-reply-form">
                      <textarea placeholder="Write a reply..." value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => submitComment(comment.id)} disabled={submitting || !replyText.trim()}>
                          <Send size={12} /> Reply
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => setReplyTo(null)}><X size={12} /> Cancel</button>
                      </div>
                    </div>
                  )}

                  {getReplies(comment.id).map(reply => (
                    <div key={reply.id} className="blog-comment blog-comment-reply">
                      <div className="blog-comment-header">
                        <div className="blog-comment-avatar">
                          {reply.profiles?.avatar_url ? <img src={reply.profiles.avatar_url} alt="" /> : <User size={14} />}
                        </div>
                        <div>
                          <strong>{reply.profiles?.first_name || 'User'} {reply.profiles?.last_name || ''}</strong>
                          <span className="blog-comment-time">{new Date(reply.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                      <p className="blog-comment-text">{reply.content}</p>
                    </div>
                  ))}
                </div>
              ))}
              {comments.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No comments yet. Be the first!</p>}
            </div>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="blog-article-sidebar">
          {related.length > 0 && (
            <div className="blog-related">
              <h4>Related Articles</h4>
              {related.map(r => (
                <Link key={r.id} to={`/dashboard/blog/${r.slug || r.id}`} className="blog-related-card">
                  <div className="blog-related-img" style={{ backgroundImage: r.featured_image_url ? `url(${r.featured_image_url})` : 'linear-gradient(135deg, #1e293b, #334155)' }} />
                  <div>
                    <h5>{r.title}</h5>
                    <span>{new Date(r.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
