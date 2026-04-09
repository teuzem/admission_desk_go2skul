import { X, Download, Trash2, RefreshCw, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Crop, ZoomIn, ZoomOut, Check, Undo2 } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { getAdmissionDocUrl } from '../../../../lib/storageHelpers'

interface Props {
  file?: File | null
  fileUrl?: string | null
  fileName: string
  onClose: () => void
  onDelete?: () => void
  onReplace?: () => void
  onSaveEdited?: (editedFile: File) => void
}

export default function DocumentPreviewModal({ file, fileUrl, fileName, onClose, onDelete, onReplace, onSaveEdited }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  // Image editing state
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)
  const isPdf = ext === 'pdf'

  useEffect(() => {
    const getUrl = async () => {
      setLoading(true)
      if (file) {
        setPreviewUrl(URL.createObjectURL(file))
      } else if (fileUrl) {
        const signed = await getAdmissionDocUrl(fileUrl)
        setPreviewUrl(signed)
      }
      setLoading(false)
    }
    getUrl()
    return () => {
      if (previewUrl && file) URL.revokeObjectURL(previewUrl)
    }
  }, [file, fileUrl])

  const handleDownload = () => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = fileName
    a.click()
  }

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const startEditing = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
  }

  const applyEdits = async () => {
    if (!previewUrl || !croppedAreaPixels) return

    try {
      const editedBlob = await getCroppedImg(previewUrl, croppedAreaPixels, rotation, flipH, flipV)
      if (editedBlob && onSaveEdited) {
        const editedFile = new File([editedBlob], fileName, { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` })
        onSaveEdited(editedFile)
      }
      setIsEditing(false)
    } catch (err) {
      console.error('Image edit error:', err)
    }
  }

  // Image Editor UI
  if (isEditing && previewUrl && isImage) {
    return (
      <div className="adm-editor-overlay">
        {/* Toolbar */}
        <div className="adm-editor-toolbar">
          <div className="adm-editor-toolbar-group">
            <button className="adm-editor-btn danger" onClick={cancelEditing}>
              <Undo2 size={14} /> Cancel
            </button>
          </div>

          <div className="adm-editor-toolbar-group">
            <button className="adm-editor-btn" onClick={() => setRotation(r => r - 90)} title="Rotate Left">
              <RotateCcw size={14} />
            </button>
            <button className="adm-editor-btn" onClick={() => setRotation(r => r + 90)} title="Rotate Right">
              <RotateCw size={14} />
            </button>
            <button className="adm-editor-btn" onClick={() => setFlipH(f => !f)} title="Flip Horizontal" style={flipH ? { background: 'rgba(0,204,160,0.3)', borderColor: '#00CCA0' } : {}}>
              <FlipHorizontal size={14} />
            </button>
            <button className="adm-editor-btn" onClick={() => setFlipV(f => !f)} title="Flip Vertical" style={flipV ? { background: 'rgba(0,204,160,0.3)', borderColor: '#00CCA0' } : {}}>
              <FlipVertical size={14} />
            </button>
          </div>

          <div className="adm-editor-toolbar-group">
            <button className="adm-editor-btn primary" onClick={applyEdits}>
              <Check size={14} /> Apply Changes
            </button>
          </div>
        </div>

        {/* Crop Area */}
        <div className="adm-editor-crop-area">
          <Cropper
            image={previewUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: {
                background: '#1a1a1a',
              },
              mediaStyle: {
                transform: `${flipH ? 'scaleX(-1)' : ''} ${flipV ? 'scaleY(-1)' : ''}`,
              }
            }}
          />
        </div>

        {/* Controls */}
        <div className="adm-editor-controls">
          <div className="adm-editor-slider-group">
            <ZoomOut size={14} />
            <span>Zoom</span>
            <input
              type="range"
              min={1}
              max={5}
              step={0.1}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
            />
            <ZoomIn size={14} />
          </div>
          <div className="adm-editor-slider-group">
            <RotateCcw size={14} />
            <span>Rotation</span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={e => setRotation(Number(e.target.value))}
            />
            <RotateCw size={14} />
            <span style={{ color: '#00CCA0', minWidth: 40 }}>{rotation}°</span>
          </div>
        </div>
      </div>
    )
  }

  // Standard Preview UI
  return (
    <div className="adm-preview-overlay" onClick={onClose}>
      <div className="adm-preview-card" onClick={e => e.stopPropagation()}>
        <div className="adm-preview-header">
          <h3>{fileName}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 6 }}>
            <X size={20} />
          </button>
        </div>

        <div className="adm-preview-body">
          {loading ? (
            <div style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div className="spinning" style={{ width: 24, height: 24, border: '2px solid #e2e8f0', borderTopColor: '#3A4391', borderRadius: '50%' }} />
              Loading preview...
            </div>
          ) : previewUrl ? (
            isImage ? (
              <img src={previewUrl} alt={fileName} />
            ) : isPdf ? (
              <iframe src={previewUrl} title={fileName} />
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>Preview not available for .{ext} files</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Download the file to view it</div>
              </div>
            )
          ) : (
            <div style={{ color: '#94a3b8' }}>No preview available</div>
          )}
        </div>

        <div className="adm-preview-actions">
          {/* Edit button — only for images */}
          {isImage && previewUrl && (
            <button className="adm-btn-back" onClick={startEditing} style={{ gap: '0.4rem' }}>
              <Crop size={14} /> Edit Image
            </button>
          )}
          {onReplace && (
            <button className="adm-btn-back" onClick={onReplace}>
              <RefreshCw size={14} /> Replace
            </button>
          )}
          {onDelete && (
            <button className="adm-btn-back" onClick={onDelete} style={{ color: '#ef4444', borderColor: '#fecaca' }}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button className="adm-btn-next" onClick={handleDownload}>
            <Download size={14} /> Download
          </button>
        </div>
      </div>
    </div>
  )
}

// ──── Canvas utility: crop, rotate, flip image ────
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number = 0,
  flipH: boolean = false,
  flipV: boolean = false
): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const rotRad = getRadianAngle(rotation)
  const { width: bBoxW, height: bBoxH } = rotateSize(image.width, image.height, rotation)

  // Set canvas to bounding box size
  canvas.width = bBoxW
  canvas.height = bBoxH

  ctx.translate(bBoxW / 2, bBoxH / 2)
  ctx.rotate(rotRad)
  if (flipH) ctx.scale(-1, 1)
  if (flipV) ctx.scale(1, -1)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  // Extract cropped area
  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')
  if (!croppedCtx) return null

  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve) => {
    croppedCanvas.toBlob(
      (blob) => resolve(blob),
      'image/jpeg',
      0.95
    )
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation)
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}
