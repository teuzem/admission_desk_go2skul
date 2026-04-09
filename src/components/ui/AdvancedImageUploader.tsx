/**
 * AdvancedImageUploader — Professional drag-and-drop media zone
 * with crop, zoom, rotate, and preview capabilities.
 */
import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { Upload, X, Pencil, Trash2, RotateCcw, RotateCw, Image as ImageIcon, Crop, ZoomIn, Check } from 'lucide-react'
import './AdvancedImageUploader.css'

interface AdvancedImageUploaderProps {
  /** Called with the final processed File when user confirms */
  onFileReady: (file: File) => void
  /** Current file, if any (for controlled usage) */
  currentFile?: File | null
  /** Optional existing image URL (e.g. from database) */
  existingImageUrl?: string | null
  /** Label shown above the drop zone */
  label?: string
  /** Accepted MIME types */
  accept?: string[]
  /** Max file size in bytes (default 5MB) */
  maxSize?: number
  /** Aspect ratio for the cropper (default 1 = square) */
  aspectRatio?: number
}

/** Crop an image using Canvas API and return a File */
async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number = 0,
  fileName: string = 'cropped.png'
): Promise<File> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const radians = (rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))

  // Compute bounding box of the rotated image
  const bW = image.width * cos + image.height * sin
  const bH = image.width * sin + image.height * cos

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.translate(-pixelCrop.x, -pixelCrop.y)
  ctx.translate(bW / 2, bH / 2)
  ctx.rotate(radians)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], fileName, { type: 'image/png' }))
      }
    }, 'image/png', 0.95)
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (e) => reject(e))
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const ASPECT_OPTIONS = [
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: 'Free', value: 0 },
]

export default function AdvancedImageUploader({
  onFileReady,
  currentFile = null,
  existingImageUrl = null,
  label = 'University Logo',
  accept = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  maxSize = 5 * 1024 * 1024,
  aspectRatio: defaultAspect = 1,
}: AdvancedImageUploaderProps) {
  const [file, setFile] = useState<File | null>(currentFile)
  const [preview, setPreview] = useState<string | null>(existingImageUrl || null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSrc, setEditorSrc] = useState<string | null>(null)
  const [originalFileName, setOriginalFileName] = useState<string>('image.png')

  // Cropper state
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [aspect, setAspect] = useState(defaultAspect)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const f = acceptedFiles[0]
    if (f.size > maxSize) {
      alert(`File too large. Maximum size is ${formatBytes(maxSize)}.`)
      return
    }
    setOriginalFileName(f.name)
    const reader = new FileReader()
    reader.onload = () => {
      setEditorSrc(reader.result as string)
      setEditorOpen(true)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
    }
    reader.readAsDataURL(f)
  }, [maxSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: accept.reduce((acc, type) => ({ ...acc, [type]: [] }), {} as Record<string, string[]>),
    maxFiles: 1,
    multiple: false,
  })

  const handleApplyCrop = async () => {
    if (!editorSrc || !croppedAreaPixels) return
    try {
      const croppedFile = await getCroppedImage(editorSrc, croppedAreaPixels, rotation, originalFileName)
      setFile(croppedFile)
      // Create preview from cropped file
      const url = URL.createObjectURL(croppedFile)
      setPreview(url)
      onFileReady(croppedFile)
      setEditorOpen(false)
    } catch (err) {
      console.error('Crop error:', err)
    }
  }

  const handleRemove = () => {
    setFile(null)
    setPreview(null)
    setEditorSrc(null)
    onFileReady(null as any)
  }

  const handleReEdit = () => {
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setEditorSrc(reader.result as string)
        setEditorOpen(true)
      }
      reader.readAsDataURL(file)
    } else if (preview) {
      setEditorSrc(preview)
      setEditorOpen(true)
    }
  }

  return (
    <div className="aiu-container">
      {label && (
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
          {label}
        </label>
      )}

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`aiu-dropzone ${isDragActive ? 'active' : ''} ${preview ? 'has-file' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="aiu-drop-icon">
          {isDragActive ? <Crop size={24} /> : <Upload size={24} />}
        </div>
        <div className="aiu-drop-title">
          {isDragActive ? 'Drop your image here!' : 'Drag & Drop your image here'}
        </div>
        <div className="aiu-drop-subtitle">
          or <span>click to browse</span> your files
          <br />
          Max {formatBytes(maxSize)}
        </div>
        <div className="aiu-drop-formats">
          {['PNG', 'JPG', 'WEBP', 'SVG'].map(f => (
            <span key={f} className="aiu-format-tag">{f}</span>
          ))}
        </div>
      </div>

      {/* Preview Card */}
      {preview && (
        <div className="aiu-preview-card">
          <img src={preview} alt="Preview" className="aiu-preview-thumb" />
          <div className="aiu-preview-info">
            <div className="aiu-preview-name">{file?.name || 'Uploaded image'}</div>
            <div className="aiu-preview-meta">
              {file ? formatBytes(file.size) : 'Existing image'} • Ready to submit
            </div>
          </div>
          <div className="aiu-preview-actions">
            <button type="button" className="aiu-action-btn edit" onClick={handleReEdit} title="Edit image">
              <Pencil size={14} />
            </button>
            <button type="button" className="aiu-action-btn delete" onClick={handleRemove} title="Remove image">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Editor Overlay */}
      {editorOpen && editorSrc && (
        <div className="aiu-editor-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditorOpen(false) }}>
          <div className="aiu-editor-modal">
            {/* Header */}
            <div className="aiu-editor-header">
              <h3><ImageIcon size={16} style={{ color: '#3A4391' }} /> Edit Image</h3>
              <button className="aiu-editor-close" onClick={() => setEditorOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Crop Area */}
            <div className="aiu-crop-area">
              <Cropper
                image={editorSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect || undefined}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                showGrid
                cropShape="rect"
                style={{
                  containerStyle: { borderRadius: 0 },
                  cropAreaStyle: { border: '2px solid #00CCA0', color: 'rgba(0,0,0,0.65)' },
                }}
              />
            </div>

            {/* Controls */}
            <div className="aiu-controls">
              {/* Zoom */}
              <div className="aiu-control-row">
                <span className="aiu-control-label"><ZoomIn size={13} /> Zoom</span>
                <input
                  type="range" min={1} max={3} step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="aiu-control-slider"
                />
                <span className="aiu-control-value">{zoom.toFixed(1)}×</span>
              </div>

              {/* Rotation */}
              <div className="aiu-control-row">
                <span className="aiu-control-label"><RotateCw size={13} /> Rotate</span>
                <input
                  type="range" min={0} max={360} step={1}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="aiu-control-slider"
                />
                <span className="aiu-control-value">{rotation}°</span>
                <div className="aiu-rotate-btns">
                  <button type="button" className="aiu-rotate-btn" onClick={() => setRotation(r => (r - 90 + 360) % 360)} title="Rotate left">
                    <RotateCcw size={13} />
                  </button>
                  <button type="button" className="aiu-rotate-btn" onClick={() => setRotation(r => (r + 90) % 360)} title="Rotate right">
                    <RotateCw size={13} />
                  </button>
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="aiu-control-row">
                <span className="aiu-control-label">Ratio</span>
                <div className="aiu-aspect-btns">
                  {ASPECT_OPTIONS.map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      className={`aiu-aspect-btn ${aspect === opt.value ? 'active' : ''}`}
                      onClick={() => setAspect(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="aiu-editor-footer">
              <button type="button" className="aiu-btn aiu-btn-cancel" onClick={() => setEditorOpen(false)}>
                Cancel
              </button>
              <button type="button" className="aiu-btn aiu-btn-apply" onClick={handleApplyCrop}>
                <Check size={14} /> Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
