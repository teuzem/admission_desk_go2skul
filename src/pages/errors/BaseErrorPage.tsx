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
            <img
              src="/admission-desk-logo.png"
              alt="Admission Desk — International University Admissions Portal"
              className="error-logo-img"
              width="200"
              height="128"
            />
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
