import { useState, useRef, useEffect } from 'react'
import { Paperclip, Send, MapPin, Loader2, X, Smile } from 'lucide-react'
import EmojiPicker from './EmojiPicker'
import { UploadPreviewPanel } from './DocumentPreview'
import { useGeolocation } from './LocationMessage'
import toast from 'react-hot-toast'

interface ChatComposerProps {
  onSendMessage: (content: string, files: File[], caption: string) => Promise<void>
  onSendLocation: (lat: number, lng: number) => Promise<void>
  onTyping?: () => void
  disabled?: boolean
}

export default function ChatComposer({ onSendMessage, onSendLocation, onTyping, disabled }: ChatComposerProps) {
  const [messageInput, setMessageInput] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [caption, setCaption] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showUploadPreview, setShowUploadPreview] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { getPosition } = useGeolocation()

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [messageInput])

  // When files are added, show the preview panel
  useEffect(() => {
    if (files.length > 0) setShowUploadPreview(true)
  }, [files.length])

  const handleSend = async () => {
    if (sending || disabled) return
    if (!messageInput.trim() && files.length === 0) return

    setSending(true)
    try {
      await onSendMessage(messageInput.trim(), files, caption.trim())
      setMessageInput('')
      setFiles([])
      setCaption('')
      setShowUploadPreview(false)
      setShowEmoji(false)
      if (textareaRef.current) textareaRef.current.style.height = '24px'
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      // Validate file size (max 25MB each)
      const valid = newFiles.filter(f => {
        if (f.size > 25 * 1024 * 1024) {
          toast.error(`${f.name} exceeds 25MB limit`)
          return false
        }
        return true
      })
      setFiles(prev => [...prev, ...valid])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    if (files.length <= 1) {
      setShowUploadPreview(false)
      setCaption('')
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji)
    textareaRef.current?.focus()
  }

  const handleShareLocation = async () => {
    if (gettingLocation) return
    setGettingLocation(true)
    try {
      const pos = await getPosition()
      await onSendLocation(pos.latitude, pos.longitude)
      toast.success('Location shared!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to get location')
    } finally {
      setGettingLocation(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files)
      const valid = newFiles.filter(f => f.size <= 25 * 1024 * 1024)
      setFiles(prev => [...prev, ...valid])
    }
  }

  return (
    <div
      className="chat-composer-root"
      onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
      onDrop={handleDrop}
    >
      {/* Upload Preview Panel (slide up when files selected) */}
      {showUploadPreview && files.length > 0 && (
        <UploadPreviewPanel
          files={files}
          caption={caption}
          onCaptionChange={setCaption}
          onRemoveFile={handleRemoveFile}
          onClose={() => {
            setShowUploadPreview(false)
            setFiles([])
            setCaption('')
          }}
        />
      )}

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="chat-emoji-anchor">
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmoji(false)}
          />
        </div>
      )}

      {/* Composer Bar */}
      <div className="chat-composer-bar">
        {/* Emoji Toggle */}
        <button
          className={`chat-composer-icon-btn ${showEmoji ? 'active' : ''}`}
          onClick={() => setShowEmoji(!showEmoji)}
          title="Emoji"
          type="button"
        >
          <Smile size={22} />
        </button>

        {/* File Attach */}
        <label className={`chat-composer-icon-btn ${files.length > 0 ? 'has-files' : ''}`} title="Attach file">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <Paperclip size={22} />
          {files.length > 0 && (
            <span className="chat-composer-file-badge">{files.length}</span>
          )}
        </label>

        {/* Text Input */}
        <div className="chat-composer-input-wrap">
          <textarea
            ref={textareaRef}
            value={messageInput}
            onChange={e => {
              setMessageInput(e.target.value)
              onTyping?.()
            }}
            placeholder="Type a message"
            className="chat-composer-textarea"
            rows={1}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Location Share */}
        <button
          className="chat-composer-icon-btn location-btn"
          onClick={handleShareLocation}
          disabled={gettingLocation}
          title="Share location"
          type="button"
        >
          {gettingLocation ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <MapPin size={20} />
          )}
        </button>

        {/* Send */}
        <button
          className={`chat-composer-send-btn ${(messageInput.trim() || files.length > 0) ? 'ready' : ''}`}
          onClick={handleSend}
          disabled={sending || (!messageInput.trim() && files.length === 0)}
          type="button"
        >
          {sending ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>
    </div>
  )
}
