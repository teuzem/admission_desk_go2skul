import { Share2, Facebook, Twitter, Linkedin, MessageCircle, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface ShareButtonsProps {
  url: string
  title: string
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle} ${encodedUrl}`
  }

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Share2 size={16} /> Share:
      </span>
      <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" 
         style={{ padding: '8px', borderRadius: '50%', background: '#1877F2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9, transition: '0.2s', textDecoration: 'none' }}
         onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.9')}
         title="Share on Facebook">
        <Facebook size={16} fill="currentColor" />
      </a>
      <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" 
         style={{ padding: '8px', borderRadius: '50%', background: '#1DA1F2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9, transition: '0.2s', textDecoration: 'none' }}
         onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.9')}
         title="Share on Twitter/X">
        <Twitter size={16} fill="currentColor" />
      </a>
      <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" 
         style={{ padding: '8px', borderRadius: '50%', background: '#0A66C2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9, transition: '0.2s', textDecoration: 'none' }}
         onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.9')}
         title="Share on LinkedIn">
        <Linkedin size={16} fill="currentColor" />
      </a>
      <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" 
         style={{ padding: '8px', borderRadius: '50%', background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9, transition: '0.2s', textDecoration: 'none' }}
         onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.9')}
         title="Share on WhatsApp">
        <MessageCircle size={16} />
      </a>
      <button onClick={handleCopy} 
         style={{ padding: '8px', borderRadius: '50%', background: '#64748b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9, transition: '0.2s', border: 'none', cursor: 'pointer' }}
         onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.9')}
         title="Copy Link">
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  )
}
