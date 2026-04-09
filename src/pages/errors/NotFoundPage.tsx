import { Link } from 'react-router-dom'
import { Home, ArrowLeft, Search } from 'lucide-react'
import SEOHead from '../../components/seo/SEOHead'
import './ErrorPages.css'

export default function NotFoundPage() {
  return (
    <>
      <SEOHead
        title="Page Not Found"
        description="The page you are looking for doesn't exist or has been moved."
        noIndex
      />
      <div className="error-page">
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

          {/* Animated 404 code */}
          <div className="error-code-display">404</div>

          <h1 className="error-title">Page Not Found</h1>
          <p className="error-description">
            Oops! The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>

          {/* Action buttons */}
          <div className="error-actions">
            <Link to="/login" className="error-btn-primary">
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
          </div>
        </div>
      </div>
    </>
  )
}
