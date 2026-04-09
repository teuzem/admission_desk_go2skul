import { useState } from 'react'
import { FileText, Image, FileSpreadsheet, File as FileIcon, Download, Eye, X } from 'lucide-react'
import { getMessageAttachmentUrl } from '../../lib/storageHelpers'

interface DocumentPreviewProps {
  attachment: {
    id: string
    file_name: string
    file_url: string
    file_type?: string
    file_size?: number
  }
  caption?: string
  isOwnMessage?: boolean
}

/** Format bytes to human readable */
function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Get file extension */
function getExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() || ''
}

/** Get icon and color based on file type */
function getFileMeta(name: string, type?: string) {
  const ext = getExt(name)
  const mimeOrExt = type || ext

  if (mimeOrExt.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return { icon: Image, color: '#10b981', bg: '#ecfdf5', label: ext.toUpperCase() }
  }
  if (mimeOrExt === 'application/pdf' || ext === 'pdf') {
    return { icon: FileText, color: '#ef4444', bg: '#fef2f2', label: 'PDF' }
  }
  if (['doc', 'docx'].includes(ext) || mimeOrExt.includes('word')) {
    return { icon: FileText, color: '#3b82f6', bg: '#eff6ff', label: ext.toUpperCase() }
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || mimeOrExt.includes('spreadsheet') || mimeOrExt.includes('excel')) {
    return { icon: FileSpreadsheet, color: '#10b981', bg: '#f0fdf4', label: ext.toUpperCase() }
  }
  if (['ppt', 'pptx'].includes(ext) || mimeOrExt.includes('presentation')) {
    return { icon: FileText, color: '#f59e0b', bg: '#fffbeb', label: ext.toUpperCase() }
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { icon: FileIcon, color: '#8b5cf6', bg: '#f5f3ff', label: ext.toUpperCase() }
  }
  return { icon: FileIcon, color: '#64748b', bg: '#f8fafc', label: ext.toUpperCase() || 'FILE' }
}

function isImageFile(name: string, type?: string): boolean {
  const ext = getExt(name)
  return (type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext))
}

export default function DocumentPreview({ attachment, caption, isOwnMessage }: DocumentPreviewProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const meta = getFileMeta(attachment.file_name, attachment.file_type)
  const isImg = isImageFile(attachment.file_name, attachment.file_type)

  const resolveUrl = async () => {
    if (resolvedUrl) return resolvedUrl
    setLoading(true)
    try {
      let url = attachment.file_url
      if (!url.startsWith('http')) {
        const signed = await getMessageAttachmentUrl(url)
        url = signed || url
      }
      setResolvedUrl(url)
      return url
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = async () => {
    const url = await resolveUrl()
    if (isImg) {
      setLightboxOpen(true)
    } else {
      window.open(url, '_blank')
    }
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = await resolveUrl()
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const displayUrl = resolvedUrl || (attachment.file_url.startsWith('http') ? attachment.file_url : null)

  return (
    <>
      <div className={`doc-preview-bubble ${isOwnMessage ? 'own' : 'other'}`} onClick={handleOpen}>
        {isImg && displayUrl && !imageError ? (
          <div className="doc-preview-image-wrap">
            <img
              src={displayUrl}
              alt={attachment.file_name}
              className="doc-preview-image"
              onError={() => setImageError(true)}
              onLoad={() => {}}
            />
            <div className="doc-preview-image-overlay">
              <Eye size={20} />
            </div>
          </div>
        ) : (
          <div className="doc-preview-file-card">
            <div className="doc-preview-file-icon" style={{ background: meta.bg, color: meta.color }}>
              <meta.icon size={22} />
            </div>
            <div className="doc-preview-file-info">
              <span className="doc-preview-file-name">{attachment.file_name}</span>
              <span className="doc-preview-file-meta">
                <span className="doc-preview-file-type" style={{ color: meta.color }}>{meta.label}</span>
                {attachment.file_size ? ` · ${formatFileSize(attachment.file_size)}` : ''}
              </span>
            </div>
            <button className="doc-preview-download-btn" onClick={handleDownload} title="Download">
              <Download size={16} />
            </button>
          </div>
        )}

        {caption && (
          <div className="doc-preview-caption">{caption}</div>
        )}
      </div>

      {/* Lightbox for images */}
      {lightboxOpen && displayUrl && (
        <div className="doc-lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="doc-lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="doc-lightbox-close" onClick={() => setLightboxOpen(false)}>
              <X size={24} />
            </button>
            <img src={displayUrl} alt={attachment.file_name} className="doc-lightbox-img" />
            <div className="doc-lightbox-info">
              <span>{attachment.file_name}</span>
              <button onClick={handleDownload} className="doc-lightbox-dl-btn">
                <Download size={16} /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Upload preview component - shows selected files before sending */
export function UploadPreviewPanel({
  files,
  caption,
  onCaptionChange,
  onRemoveFile,
  onClose,
}: {
  files: File[]
  caption: string
  onCaptionChange: (v: string) => void
  onRemoveFile: (idx: number) => void
  onClose: () => void
}) {
  return (
    <div className="upload-preview-panel">
      <div className="upload-preview-header">
        <button className="upload-preview-close" onClick={onClose}>
          <X size={20} />
        </button>
        <span className="upload-preview-title">
          {files.length} file{files.length > 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="upload-preview-grid">
        {files.map((file, idx) => {
          const isImg = file.type.startsWith('image/')
          const meta = getFileMeta(file.name, file.type)
          return (
            <div key={idx} className="upload-preview-item">
              {isImg ? (
                <img src={URL.createObjectURL(file)} alt={file.name} className="upload-preview-thumb" />
              ) : (
                <div className="upload-preview-file-icon" style={{ background: meta.bg, color: meta.color }}>
                  <meta.icon size={28} />
                  <span className="upload-preview-ext">{meta.label}</span>
                </div>
              )}
              <button className="upload-preview-remove" onClick={() => onRemoveFile(idx)}>
                <X size={14} />
              </button>
              <div className="upload-preview-name">{file.name}</div>
              <div className="upload-preview-size">{formatFileSize(file.size)}</div>
            </div>
          )
        })}
      </div>

      <div className="upload-caption-row">
        <input
          type="text"
          placeholder="Add a caption..."
          value={caption}
          onChange={e => onCaptionChange(e.target.value)}
          className="upload-caption-input"
        />
      </div>
    </div>
  )
}
