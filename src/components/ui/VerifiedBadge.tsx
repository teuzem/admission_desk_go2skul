import { useState, useEffect } from 'react'

interface VerifiedBadgeProps {
  isVerified: boolean
  size?: number
  showTooltip?: boolean
  tooltipText?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Premium verified badge (blue checkmark) shown for agents with KYC status "approved".
 * Inspired by Facebook/Meta verified badge with smooth animation.
 */
export default function VerifiedBadge({
  isVerified,
  size = 18,
  showTooltip = true,
  tooltipText = 'Verified Agent',
  className = '',
  style
}: VerifiedBadgeProps) {
  const [hovered, setHovered] = useState(false)

  if (!isVerified) return null

  return (
    <span
      className={`verified-badge-wrapper ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'default', ...style }}
      title={showTooltip ? '' : tooltipText}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="verified-badge-icon"
        style={{ flexShrink: 0 }}
      >
        {/* Outer shield/badge shape */}
        <path
          d="M12 1.5L3.5 5.5V11C3.5 16.55 7.02 21.74 12 23C16.98 21.74 20.5 16.55 20.5 11V5.5L12 1.5Z"
          fill="url(#verifiedGradient)"
        />
        {/* Inner checkmark */}
        <path
          d="M9.5 12.5L11.5 14.5L15 10.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="verified-checkmark"
        />
        <defs>
          <linearGradient id="verifiedGradient" x1="3.5" y1="1.5" x2="20.5" y2="23" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1DA1F2" />
            <stop offset="50%" stopColor="#1877F2" />
            <stop offset="100%" stopColor="#3A4391" />
          </linearGradient>
        </defs>
      </svg>

      {/* Tooltip */}
      {showTooltip && hovered && (
        <span className="verified-badge-tooltip">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path
              d="M12 1.5L3.5 5.5V11C3.5 16.55 7.02 21.74 12 23C16.98 21.74 20.5 16.55 20.5 11V5.5L12 1.5Z"
              fill="white"
            />
            <path d="M9.5 12.5L11.5 14.5L15 10.5" stroke="#1877F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tooltipText}
        </span>
      )}
    </span>
  )
}

/**
 * Inline verified badge for use alongside text (e.g., in tables, lists).
 * Smaller, simpler, no tooltip by default.
 */
export function VerifiedBadgeInline({
  isVerified,
  size = 14,
}: {
  isVerified: boolean
  size?: number
}) {
  if (!isVerified) return null

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="verified-badge-inline"
      style={{ flexShrink: 0, marginLeft: 4, verticalAlign: 'middle' }}
    >
      <path
        d="M12 1.5L3.5 5.5V11C3.5 16.55 7.02 21.74 12 23C16.98 21.74 20.5 16.55 20.5 11V5.5L12 1.5Z"
        fill="url(#verifiedGradientInline)"
      />
      <path
        d="M9.5 12.5L11.5 14.5L15 10.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="verifiedGradientInline" x1="3.5" y1="1.5" x2="20.5" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1DA1F2" />
          <stop offset="50%" stopColor="#1877F2" />
          <stop offset="100%" stopColor="#3A4391" />
        </linearGradient>
      </defs>
    </svg>
  )
}
