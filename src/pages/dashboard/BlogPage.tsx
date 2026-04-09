import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useTranslation } from 'react-i18next'
import { Search, Calendar, ChevronRight, BookOpen } from 'lucide-react'
import './BlogPage.css'

export default function BlogPage() {
  const { t } = useTranslation()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [categories, setCategories] = useState<string[]>(['All'])

  useEffect(() => {
    fetchPosts()

    const subscription = supabase
      .channel('public:blog_posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_posts' }, (payload) => {
        fetchPosts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })

      if (error) throw error

      setPosts(data || [])
      
      // Extract unique categories
      if (data) {
        const uniqueCats = ['All', ...Array.from(new Set(data.map(p => p.category).filter(Boolean)))]
        setCategories(uniqueCats as string[])
      }
    } catch (err) {
      console.error('Error fetching blog posts:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter logic
  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory
    return matchesSearch && matchesCategory
  })

  // Feature the newest post
  const featuredPost = filteredPosts.length > 0 ? filteredPosts[0] : null
  const regularPosts = filteredPosts.length > 1 ? filteredPosts.slice(1) : []

  return (
    <div className="blog-page-container">
      {/* Hero Header */}
      <div className="blog-hero">
        <div className="blog-hero-content">
          <h1>Discover Admission Desk Blog</h1>
          <p>Insights, expert advice, and the latest news from the global education sector.</p>
          
          <div className="blog-search-box">
            <Search size={20} className="blog-search-icon" />
            <input 
              type="text" 
              placeholder="Search articles..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="blog-page-body">
        {/* Category Pills */}
        <div className="blog-categories">
          {categories.map(cat => (
            <button 
              key={cat} 
              className={`blog-category-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="blog-loading">
            <div className="spinner"></div>
            <p>Loading articles...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="blog-empty">
            <BookOpen size={48} className="empty-icon" />
            <h3>No articles found</h3>
            <p>We couldn't match any articles to your search or category filter.</p>
            <button onClick={() => { setSearchTerm(''); setActiveCategory('All') }} className="btn btn-primary">Clear Filters</button>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {activeCategory === 'All' && !searchTerm && featuredPost && (
              <Link to={`/dashboard/blog/${featuredPost.slug || featuredPost.id}`} className="blog-featured-card">
                <div 
                  className="blog-featured-img" 
                  style={{ backgroundImage: featuredPost.featured_image_url ? `url(${featuredPost.featured_image_url})` : `linear-gradient(135deg, #1e3a6e, #3A4391)` }}
                >
                  {featuredPost.category && <span className="blog-badge">{featuredPost.category}</span>}
                </div>
                <div className="blog-featured-content">
                  <div className="blog-meta">
                    <Calendar size={14} />
                    <span>{new Date(featuredPost.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    {featuredPost.author_name && (
                      <>
                        <span className="dot">•</span>
                        <span>{featuredPost.author_name}</span>
                      </>
                    )}
                  </div>
                  <h2>{featuredPost.title}</h2>
                  <p>{featuredPost.excerpt}</p>
                  <span className="blog-read-more">Read article <ChevronRight size={16} /></span>
                </div>
              </Link>
            )}

            {/* Grid of remaining posts */}
            <div className="blog-post-grid">
              {(activeCategory === 'All' && !searchTerm ? regularPosts : filteredPosts).map(post => (
                <Link key={post.id} to={`/dashboard/blog/${post.slug || post.id}`} className="blog-grid-card">
                  <div 
                    className="blog-grid-img" 
                    style={{ backgroundImage: post.featured_image_url ? `url(${post.featured_image_url})` : `linear-gradient(135deg, #1e293b, #334155)` }}
                  >
                    {post.category && <span className="blog-badge">{post.category}</span>}
                  </div>
                  <div className="blog-grid-content">
                    <h3>{post.title}</h3>
                    <p className="blog-summary">{post.excerpt}</p>
                    <div className="blog-meta">
                      <Calendar size={14} />
                      <span>{new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
