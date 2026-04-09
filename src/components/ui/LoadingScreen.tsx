import './LoadingScreen.css'

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="#3A4391"/>
            <path d="M14 24L22 16L30 24L22 32L14 24Z" fill="#00CCA0"/>
            <path d="M22 16L30 24L38 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M22 32L30 24L38 32" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          </svg>
        </div>
        <div className="loading-text">
          <span>Admission</span><span className="accent">Desk</span>
        </div>
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  )
}
