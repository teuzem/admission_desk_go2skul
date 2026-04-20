import React, { Component, ErrorInfo } from 'react'
import { Home, RefreshCw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import '../../pages/errors/ErrorPages.css'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    // Log to console for debugging
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/login'
  }

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page type-500">
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

            {/* Icon */}
            <div className="error-icon-circle danger">
              <AlertTriangle size={36} />
            </div>

            <h1 className="error-title">Something Went Wrong</h1>
            <p className="error-description">
              Oops! An unexpected error occurred in the application. 
              Our team has been notified, and we're working to fix it.
            </p>

            {/* Actions */}
            <div className="error-actions">
              <button onClick={this.handleReload} className="error-btn-primary">
                <RefreshCw size={18} />
                Reload Page
              </button>
              <button onClick={this.handleGoHome} className="error-btn-secondary">
                <Home size={18} />
                Go Home
              </button>
            </div>

            {/* Error details (for developers) */}
            <button
              onClick={this.toggleDetails}
              className="error-details-toggle"
            >
              {this.state.showDetails ? (
                <>
                  <ChevronUp size={14} />
                  Hide Technical Details
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  Show Technical Details
                </>
              )}
            </button>

            {this.state.showDetails && (
              <div className="error-details-box">
                <pre>
                  {this.state.error?.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
