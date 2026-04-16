import { Link } from 'react-router-dom'
import { Home, ArrowLeft, LifeBuoy } from 'lucide-react'
import SEOHead from '../../components/seo/SEOHead'
import './ErrorPages.css'

interface BaseErrorPageProps {
  code: string | number
  title: string
  description: string
  type?: '404' | '403' | '500' | '501' | '503'
  showSupport?: boolean
}

export default function BaseErrorPage({
  code,
  title,
  description,
  type = '404',
  showSupport = false
}: BaseErrorPageProps) {
  return (
    <>
      <SEOHead
        title={`${code} ${title}`}
        description={description}
        noIndex
      />
      <div className={`error-page type-${type}`}>
        {/* Animated Background Blobs */}
        <div className="error-blobs">
          <div className="error-blob blob-1" />
          <div className="error-blob blob-2" />
          <div className="error-blob blob-3" />
        </div>

        {/* Floating decorative shapes */}
        <div className="error-floating-shapes">
          <div className="error-shape error-shape-1" />
          <div className="error-shape error-shape-2" />
          <div className="error-shape error-shape-3" />
          <div className="error-shape error-shape-4" />
          <div className="error-shape error-shape-5" />
        </div>

        <div className="error-card">
          {/* Logo */}
          <div className="error-logo">
            <div className="error-logo-icon">
              <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="10" fill="var(--color-primary)" />
                <path d="M14 24L22 16L30 24L22 32L14 24Z" fill="#00CCA0" />
                <path d="M22 16L30 24L38 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="error-logo-text">
              Admission<span>Desk</span>
            </span>
          </div>

          {/* Animated error code */}
          <div className="error-code-display">{code}</div>

          <h1 className="error-title">{title}</h1>
          <p className="error-description">{description}</p>

          {/* Action buttons */}
          <div className="error-actions">
            <Link to="/" className="error-btn-primary">
              <Home size={18} />
              Go Home
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="error-btn-secondary"
            >
              <ArrowLeft size={18} />
              Go Back
            </button>

            {showSupport && (
              <a href="mailto:support@admissiondesk.online" className="error-btn-secondary">
                <LifeBuoy size={18} />
                Contact Support
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
