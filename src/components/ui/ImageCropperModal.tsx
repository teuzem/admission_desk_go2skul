import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { useDropzone } from 'react-dropzone'
import { X, Upload, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import '../../pages/dashboard/DashboardPages.css'

interface ImageCropperModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (file: File) => void
  aspectRatio?: number
  shape?: 'rect' | 'round'
  title?: string
}

export default function ImageCropperModal({ 
  isOpen, 
  onClose, 
  onSave, 
  aspectRatio = 1, 
  shape = 'rect',
  title = 'Upload Image'
}: ImageCropperModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [fileName, setFileName] = useState('image')
  const [fileType, setFileType] = useState('image/jpeg')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setFileName(file.name)
      setFileType(file.type)
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        setImageSrc(reader.result as string)
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  })

  // Function to extract the cropped image
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', error => reject(error))
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any,
    rotation = 0
  ): Promise<File> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2d context')
    }

    const maxSize = Math.max(image.width, image.height)
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

    canvas.width = safeArea
    canvas.height = safeArea

    ctx.translate(safeArea / 2, safeArea / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-safeArea / 2, -safeArea / 2)

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    )

    const data = ctx.getImageData(0, 0, safeArea, safeArea)

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'))
          return
        }
        resolve(new File([blob], fileName, { type: fileType }))
      }, fileType)
    })
  }

  const handleSave = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      onSave(croppedFile)
      handleClose()
    } catch (e) {
      console.error(e)
    }
  }

  const handleClose = () => {
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '16px',
        width: '100%', maxWidth: '600px', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
            {title}
          </h2>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', padding: '4px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          {!imageSrc ? (
            <div {...getRootProps()} style={{
              border: `2px dashed ${isDragActive ? '#3b82f6' : '#cbd5e1'}`,
              borderRadius: '12px', padding: '3rem 1.5rem', textAlign: 'center',
              backgroundColor: isDragActive ? '#eff6ff' : '#f8fafc',
              cursor: 'pointer', transition: 'all 0.2s', minHeight: '300px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <input {...getInputProps()} />
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                backgroundColor: '#e0e7ff', color: '#4f46e5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Upload size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', margin: '0 0 0.5rem' }}>
                {isDragActive ? 'Drop image here' : 'Drag & drop your image here'}
              </h3>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
                or click to browse from your computer
              </p>
              <p style={{ color: '#94a3b8', margin: '1rem 0 0', fontSize: '0.75rem' }}>
                Supports JPG, PNG (Max 5MB)
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ position: 'relative', width: '100%', height: '350px', backgroundColor: '#333', borderRadius: '8px', overflow: 'hidden' }}>
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={aspectRatio}
                  cropShape={shape}
                  onCropChange={setCrop}
                  onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                />
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 1rem', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <ZoomOut size={18} style={{ color: '#64748b' }} />
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <ZoomIn size={18} style={{ color: '#64748b' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <RotateCw size={18} style={{ color: '#64748b' }} />
                  <input
                    type="range"
                    value={rotation}
                    min={0}
                    max={360}
                    step={1}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <span style={{ color: '#64748b', fontSize: '0.8rem', width: '30px', textAlign: 'right' }}>{rotation}°</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          {imageSrc ? (
            <button
              onClick={() => setImageSrc(null)}
              style={{
                background: 'none', border: 'none', color: '#64748b',
                fontWeight: 600, cursor: 'pointer', padding: '0.5rem 1rem'
              }}
            >
              Replace Image
            </button>
          ) : (
            <div />
          )}
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleClose}
              className="btn btn-outline"
              style={{ padding: '0.5rem 1.25rem' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={!imageSrc}
              style={{ padding: '0.5rem 1.25rem' }}
            >
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
