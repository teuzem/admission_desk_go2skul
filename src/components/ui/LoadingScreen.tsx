import './LoadingScreen.css'

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <img
            src="/admission-desk-logo.png"
            alt="Admission Desk — International University Admissions Portal"
            className="loading-logo-img"
            width="400"
            height="180"
          />
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
