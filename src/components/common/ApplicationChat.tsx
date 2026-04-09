import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { getMessageAttachmentUrl, uploadMessageAttachment } from '../../lib/storageHelpers'
import { 
  Send, Paperclip, X, Image as ImageIcon, FileText, Download, 
  CheckCheck, Check
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface ApplicationChatProps {
  applicationId: string
  currentUserId: string
  currentUserRole: string
  className?: string
}

export default function ApplicationChat({ applicationId, currentUserId, currentUserRole, className = '' }: ApplicationChatProps) {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Real-time Chat States
  const [chatPartner, setChatPartner] = useState<any>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [lastSeen, setLastSeen] = useState<string | null>(null)
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<any>(null)

  // Attachment processing
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const [attachmentCaption, setAttachmentCaption] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchParticipants()
    fetchComments()
    
    // Subscribe to new comments and presence
    const channel = supabase.channel(`app-chat-${applicationId}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })
    channelRef.current = channel

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'application_comments',
        filter: `application_id=eq.${applicationId}`
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          // fetch full msg with profile
          const { data: newMsg } = await supabase
            .from('application_comments')
            .select(`*, profiles:author_id(first_name, last_name, agency_name, avatar_url, role)`)
            .eq('id', payload.new.id)
            .single()
            
          if (newMsg) {
            setComments(prev => [...prev, newMsg])
            scrollToBottom()
          }
        } else if (payload.eventType === 'UPDATE') {
          setComments(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c))
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        const others = Object.keys(newState).filter(k => k !== currentUserId)
        if (others.length > 0) {
           setIsOnline(true)
           setLastSeen(null)
        } else {
           setIsOnline(false)
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (key !== currentUserId) {
          setIsOnline(false)
          setLastSeen(new Date().toISOString())
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.user_id !== currentUserId) {
          setIsTyping(true)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [applicationId, currentUserId])

  // Mark unread messages as read
  useEffect(() => {
    const unreadFromPartner = comments.filter(c => c.author_id !== currentUserId && !c.is_read)
    if (unreadFromPartner.length > 0) {
      markMessagesAsRead(unreadFromPartner)
    }
    scrollToBottom()
  }, [comments])

  const markMessagesAsRead = async (unreadMessages: any[]) => {
    try {
      const ids = unreadMessages.map(m => m.id)
      await supabase.from('application_comments').update({ is_read: true }).in('id', ids)
    } catch (err) {
      console.error("Error marking messages as read", err)
    }
  }

  const fetchParticipants = async () => {
    try {
      const { data: application } = await supabase
        .from('applications')
        .select('agent_id, reviewed_by')
        .eq('id', applicationId)
        .single()
        
      if (!application) return

      let partnerIdInfo = null
      if (currentUserRole === 'agent') {
        partnerIdInfo = application.reviewed_by
      } else {
        partnerIdInfo = application.agent_id
      }

      if (partnerIdInfo) {
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, agency_name, avatar_url, role')
          .eq('id', partnerIdInfo)
          .single()
          
        if (partnerProfile) {
          setChatPartner(partnerProfile)
        }
      }
    } catch (err) {
      console.error("Error fetching participants", err)
    }
  }

  const fetchComments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('application_comments')
        .select(`*, profiles:author_id(first_name, last_name, agency_name, avatar_url, role)`)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (err) {
      console.error('Error fetching comments:', err)
      toast.error('Failed to load chat history')
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setNewMessage('') // clear message since caption will be used
      
      if (file.type.startsWith('image/')) {
        setFilePreviewUrl(URL.createObjectURL(file))
      } else {
        setFilePreviewUrl(null)
      }
    }
  }

  const cancelAttachment = () => {
    setSelectedFile(null)
    setFilePreviewUrl(null)
    setAttachmentCaption('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleTyping = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: currentUserId }
      })
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    const textContent = selectedFile ? attachmentCaption.trim() : newMessage.trim()
    if (!textContent && !selectedFile) return

    try {
      setSending(true)
      
      let attachments: any[] = []
      
      if (selectedFile) {
        const path = await uploadMessageAttachment(currentUserId, selectedFile)
        attachments.push({
          title: selectedFile.name,
          url: path,
          size: selectedFile.size,
          type: selectedFile.type,
          caption: textContent
        })
      }

      const { error } = await supabase.from('application_comments').insert({
        application_id: applicationId,
        author_id: currentUserId,
        author_role: currentUserRole,
        content: selectedFile ? (textContent || 'Sent an attachment') : textContent,
        comment_type: 'comment',
        attachments: attachments.length > 0 ? attachments : null,
        is_read: false
      })

      if (error) throw error

      setNewMessage('')
      cancelAttachment()
    } catch (err: any) {
      console.error('Send error:', err)
      toast.error(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleAttachmentClick = async (path: string, type: string) => {
    const url = await getMessageAttachmentUrl(path)
    if (!url) {
      toast.error("Attachment no longer available")
      return
    }
    
    if (type.startsWith('image/') || type === 'application/pdf') {
      window.open(url, '_blank')
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = ''
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
  }

  return (
    <div className={`flex flex-col h-[600px] border border-gray-200 rounded-xl overflow-hidden shadow-sm ${className}`} style={{ backgroundColor: '#efeae2' }}>
      
      {/* Chat header */}
      <div className="bg-[#f0f2f5] border-b border-gray-300 p-3 flex items-center justify-between z-10 shadow-sm relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#128c7e] text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 shadow-sm">
            {chatPartner?.avatar_url ? (
              <img src={chatPartner.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              chatPartner?.first_name 
                ? chatPartner.first_name.charAt(0).toUpperCase()
                : (currentUserRole === 'agent' ? 'AM' : 'A')
            )}
          </div>
          <div>
            <h3 className="font-semibold text-[#111b21] leading-tight">
              {chatPartner ? (
                 chatPartner.role === 'agent' 
                   ? (chatPartner.agency_name || `${chatPartner.first_name || ''} ${chatPartner.last_name || ''}`)
                   : `${chatPartner.first_name || 'Admission'} ${chatPartner.last_name || 'Manager'}`
              ) : (
                 currentUserRole === 'agent' ? 'Admission Desk' : 'Agent'
              )}
            </h3>
            <p className="text-xs text-[#667781] translate-y-[1px]">
              {isTyping ? (
                <span className="text-[#00a884] font-medium">typing...</span>
              ) : isOnline ? (
                <span className="text-[#00a884]">Online</span>
              ) : lastSeen ? (
                <span>last seen today at {format(new Date(lastSeen), 'HH:mm')}</span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3 relative" 
        style={{ 
          backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
          backgroundRepeat: 'repeat',
          backgroundSize: '400px'
        }}
      >
        {comments.length === 0 ? (
          <div className="flex justify-center mt-6">
             <div className="bg-[#ffeecd] px-4 py-2 rounded-lg shadow-sm text-center text-sm text-[#54656f] max-w-sm">
                Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
             </div>
          </div>
        ) : (
          comments.map((msg, idx) => {
            const isMe = msg.author_id === currentUserId
            
            // Check if we need a date separator
            let showDate = false
            if (idx === 0) {
              showDate = true
            } else {
              const prevDate = new Date(comments[idx - 1].created_at).setHours(0,0,0,0)
              const currDate = new Date(msg.created_at).setHours(0,0,0,0)
              if (prevDate !== currDate) showDate = true
            }

            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="bg-gray-200/60 text-gray-600 text-xs py-1 px-3 rounded-full font-medium shadow-sm">
                      {format(new Date(msg.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[75%] px-3 md:px-4 py-1.5 md:py-2 relative flex flex-col min-w-[120px] shadow-sm`}
                    style={{ 
                      backgroundColor: isMe ? '#d9fdd3' : '#ffffff', 
                      borderRadius: isMe ? '8px 0px 8px 8px' : '0px 8px 8px 8px'
                    }}
                  >
                    
                    {/* Role indicator for other person */}
                    {!isMe && (
                      <div className="text-[12px] font-semibold text-[#00a884] mb-0.5 leading-none capitalize tracking-wide flex items-center justify-between gap-2">
                        <span>
                          {msg.profiles?.role === 'agent' 
                             ? (msg.profiles.agency_name || `${msg.profiles.first_name || ''} ${msg.profiles.last_name || ''}`)
                             : `${msg.profiles?.first_name || 'Admission'} ${msg.profiles?.last_name || 'Manager'}`}
                        </span>
                        
                        {/* Optionally show role in smaller text */}
                        <span className="text-[10px] text-gray-400 font-normal">
                          {msg.author_role?.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                    
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-1 mt-1 space-y-1.5">
                        {msg.attachments.map((att: any, i: number) => (
                          <div 
                            key={i} 
                            onClick={() => handleAttachmentClick(att.url, att.type)}
                            className="cursor-pointer rounded-md p-2 flex items-center gap-3 bg-black/5 hover:bg-black/10 transition-colors"
                          >
                            <div className="p-2 rounded-md shrink-0 bg-white shadow-sm">
                              {att.type?.startsWith('image/') ? (
                                <ImageIcon className="w-5 h-5 text-[#54656f]" />
                              ) : (
                                <FileText className="w-5 h-5 text-[#54656f]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="text-[13px] font-medium text-[#111b21] truncate">{att.title}</p>
                              <p className="text-[11px] text-[#667781]">
                                {Math.round(att.size / 1024)} KB
                              </p>
                            </div>
                            <Download className="w-4 h-4 shrink-0 text-[#8696a0]" />
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.content && msg.content !== 'Sent an attachment' && (
                      <p className="text-[14.5px] leading-[20px] text-[#111b21] whitespace-pre-wrap word-break pb-1">
                        {msg.content}
                      </p>
                    )}
                    
                    {/* Timestamp & Status */}
                    <div className="self-end flex items-center justify-end gap-1 mt-0 text-[11px] text-[#667781]">
                      {format(new Date(msg.created_at), 'HH:mm')}
                      {isMe && (
                        msg.is_read ? (
                          <CheckCheck className="w-[15px] h-[15px] text-[#53bdeb] translate-y-[-1px]" />
                        ) : (
                          <CheckCheck className="w-[15px] h-[15px] text-[#8696a0] translate-y-[-1px]" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pre-send Attachment Modal Overlay */}
      {selectedFile && (
        <div className="absolute inset-x-0 bottom-[64px] bg-white border-t border-gray-200 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-2 z-10">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900 text-sm flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-indigo-600" />
              Attach File
            </h4>
            <button onClick={cancelAttachment} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
              {filePreviewUrl ? (
                <img src={filePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <FileText className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={selectedFile.name}>
                {selectedFile.name}
              </p>
              <textarea
                value={attachmentCaption}
                onChange={(e) => {
                  setAttachmentCaption(e.target.value)
                  handleTyping()
                }}
                placeholder="Add a caption..."
                className="w-full text-sm border-gray-300 rounded-md focus:border-indigo-500 focus:ring-indigo-500 py-2 border shadow-sm"
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-2.5 bg-[#f0f2f5] shrink-0 relative z-20 flex items-end gap-3 min-h-[62px]">
          
          <button
            type="button"
            className="p-2 text-[#54656f] hover:text-[#111b21] transition-colors self-center shrink-0 disabled:opacity-50"
            disabled={sending}
          >
            <div className="w-6 h-6 flex items-center justify-center">
              😊
            </div>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,application/pdf,.doc,.docx"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 text-[#54656f] hover:text-[#111b21] transition-colors self-center shrink-0 ${selectedFile ? 'text-[#00a884]' : ''}`}
            disabled={sending}
          >
            <Paperclip className="w-6 h-6" />
          </button>
          
          <div className="flex-1 bg-white rounded-lg flex items-center shadow-sm relative my-[2px]">
            <textarea
              value={selectedFile ? attachmentCaption : newMessage}
              onChange={(e) => {
                if (selectedFile) {
                  setAttachmentCaption(e.target.value)
                } else {
                  setNewMessage(e.target.value)
                }
                handleTyping()
              }}
              placeholder={selectedFile ? "Add a caption..." : "Type a message"}
              className={`w-full resize-none border-0 focus:ring-0 text-[15px] max-h-32 bg-transparent py-2.5 px-4 text-[#111b21] placeholder-[#8696a0]`}
              rows={1}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              style={{
                minHeight: '44px',
                height: newMessage ? 'auto' : '44px', 
                resize: 'none',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || sending}
            className={`p-3 self-center rounded-full transition-colors flex items-center justify-center shrink-0 ${newMessage.trim() || selectedFile ? 'bg-[#00a884] text-white hover:bg-[#008f6f]' : 'text-[#8696a0] hover:text-[#54656f]'}`}
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-5 h-5 translate-y-[1px] translate-x-[-1px]" />
            )}
          </button>
      </div>
    </div>
  )
}
