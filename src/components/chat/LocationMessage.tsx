import { MapPin, ExternalLink, Navigation } from 'lucide-react'

interface LocationMessageProps {
  latitude: number
  longitude: number
  isOwnMessage?: boolean
}

/**
 * LocationMessage renders a small static map preview using OpenStreetMap tiles (free, no API key).
 * Uses the OSM static map tile approach with a simple tile image calculation.
 */
export default function LocationMessage({ latitude, longitude, isOwnMessage }: LocationMessageProps) {
  const zoom = 15
  // Construct a static map preview using OpenStreetMap tile server
  // We calculate the tile coordinates from lat/lng and render a center tile as preview
  const n = Math.pow(2, zoom)
  const xtile = Math.floor(((longitude + 180) / 360) * n)
  const lat_rad = (latitude * Math.PI) / 180
  const ytile = Math.floor((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2 * n)

  // Get 3x2 grid of tiles for a wider preview
  const tiles: { x: number; y: number }[] = []
  for (let dy = -1; dy <= 0; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tiles.push({ x: xtile + dx, y: ytile + dy })
    }
  }

  const osmUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`

  const formatCoord = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S'
    const lngDir = lng >= 0 ? 'E' : 'W'
    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`
  }

  return (
    <div className={`location-msg-bubble ${isOwnMessage ? 'own' : 'other'}`}>
      <a
        href={osmUrl}
        target="_blank"
        rel="noreferrer"
        className="location-map-preview"
      >
        <div className="location-tile-grid">
          {tiles.map((tile, i) => (
            <img
              key={i}
              src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
              alt=""
              className="location-tile"
              crossOrigin="anonymous"
            />
          ))}
        </div>
        <div className="location-pin-overlay">
          <div className="location-pin-marker">
            <MapPin size={24} fill="#ef4444" color="#fff" />
          </div>
        </div>
        <div className="location-gradient-overlay" />
      </a>

      <div className="location-info-bar">
        <div className="location-info-left">
          <Navigation size={14} className="location-nav-icon" />
          <div className="location-coords">
            <span className="location-label">📍 Live Location</span>
            <span className="location-coord-text">{formatCoord(latitude, longitude)}</span>
          </div>
        </div>
        <div className="location-actions">
          <a href={osmUrl} target="_blank" rel="noreferrer" className="location-action-btn" title="Open in OpenStreetMap">
            <ExternalLink size={14} />
          </a>
          <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="location-action-btn google" title="Open in Google Maps">
            <MapPin size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}

/** Hook to get current position using browser Geolocation API */
export function useGeolocation() {
  const getPosition = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          })
        },
        (err) => {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              reject(new Error('Location permission denied. Please enable location access in your browser settings.'))
              break
            case err.POSITION_UNAVAILABLE:
              reject(new Error('Location information is unavailable.'))
              break
            case err.TIMEOUT:
              reject(new Error('Location request timed out.'))
              break
            default:
              reject(new Error('An unknown error occurred while getting location.'))
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    })
  }

  return { getPosition }
}
