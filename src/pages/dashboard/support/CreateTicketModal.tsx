import React, { useState, useRef } from 'react';
import {
  X, Send, Paperclip, Image as ImageIcon, Video as VideoIcon,
  CheckCircle2, Monitor, Globe, Loader2,
  ChevronDown, HelpCircle, Layers,
  FileText, UploadCloud, ShieldAlert, MessageSquare,
  AlertTriangle, Info
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { createSupportTicket } from '../../../lib/support';
import { TICKET_CATEGORIES } from '../../../types/database-extended';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Props { onClose: () => void; }

const CreateTicketModal: React.FC<Props> = ({ onClose }) => {
  const { user, profile } = useAuth();
  const [topic, setTopic] = useState('technical');
  const [category, setCategory] = useState('bug_report');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      if (!user) throw new Error('Not authenticated');
      await createSupportTicket(
        {
          subject, 
          category, 
          priority: 'medium', 
          description: `${description}\n\n[Meta] Topic: ${topic}`,
        },
        files,
        { ...profile, email: user.email, id: user.id }
      );
      setSuccess(true);
      toast.success('Ticket submitted successfully');
      setTimeout(onClose, 2500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="kb-modal-overlay">
        <div className="kb-modal-success-card">
          <div className="kb-success-icon-wrap">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2>Ticket Submitted</h2>
          <p>Our technical specialists have been notified and will reach out to you shortly via the portal and email.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kb-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kb-ticket-page-card animate-in fade-in zoom-in duration-300">
        {/* Close Icon */}
        <button onClick={onClose} className="kb-modal-close-icon">
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <div className="kb-ticket-header">
          <div className="kb-header-main">
            <div className="kb-header-badge">
              <ShieldAlert className="w-4 h-4" /> Technical Assistance Center
            </div>
            <h3>How can our <span>Specialists</span> assist you?</h3>
            <p>Our technical team is ready to resolve any platform errors, bugs, or system irregularities you encounter.</p>
          </div>
        </div>

        {/* Technical Assistance Note */}
        <div className="kb-assistance-notice">
          <div className="notice-icon"><Info className="w-5 h-5" /></div>
          <div className="notice-content">
            <strong>Proactive Technical Support</strong>
            <p>Please provide a detailed description of the error and attach screenshots if possible. This helps our team diagnose and resolve the issue faster.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="kb-ticket-form-body">
          {/* Row 1: Select Options */}
          <div className="kb-form-row two-cols">
            <div className="kb-input-group">
              <label><span>*</span> Topic of Concern</label>
              <div className="kb-select-wrap">
                <select value={topic} onChange={e => setTopic(e.target.value)}>
                  <option value="technical">System Bug / Error</option>
                  <option value="access">Access & Permissions</option>
                  <option value="performance">Slow Loading / Performance</option>
                  <option value="data">Data Integrity Issue</option>
                  <option value="other">Other Technical Concern</option>
                </select>
                <ChevronDown className="kb-select-icon" />
              </div>
            </div>

            <div className="kb-input-group">
              <label><span>*</span> Issue Classification</label>
              <div className="kb-select-wrap">
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {TICKET_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown className="kb-select-icon" />
              </div>
            </div>
          </div>

          {/* Row 2: Subject */}
          <div className="kb-input-group">
            <label><span>*</span> Summary of the Issue</label>
            <input 
              type="text" 
              placeholder="E.g., Application page keeps crashing when uploading documents" 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
              required 
              className="kb-main-input"
            />
          </div>

          {/* Row 3: Description */}
          <div className="kb-input-group">
            <label><span>*</span> Detailed Error Description</label>
            <textarea 
              placeholder="Please describe what happened, what you expected to see, and steps to reproduce the error..." 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              required 
              rows={5}
              className="kb-main-textarea"
            />
          </div>

          {/* Row 4: Advanced Drag & Drop Uploader */}
          <div className="kb-input-group">
            <label>Visual Evidence (Screenshots/Videos)</label>
            <div 
              className={`kb-dropzone ${isDragging ? 'dragging' : ''} ${files.length > 0 ? 'has-files' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="kb-dropzone-content">
                <div className="kb-dropzone-icon">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <p>Drag and Drop evidence here or <span>choose file</span></p>
                <div className="kb-dropzone-formats">
                  Supported: Image, Video, PDF (Max 50MB)
                </div>
              </div>
              <input 
                type="file" 
                multiple 
                hidden 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*,video/*,.pdf" 
              />
            </div>

            {/* Premium File Preview Grid */}
            {files.length > 0 && (
              <div className="kb-preview-grid">
                {files.map((file, idx) => (
                  <div key={idx} className="kb-preview-card">
                    <div className="preview-media">
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt="preview" />
                      ) : file.type.startsWith('video/') ? (
                        <div className="video-preview">
                          <VideoIcon className="w-10 h-10" />
                          <div className="duration-pill">Preview Ready</div>
                        </div>
                      ) : (
                        <div className="doc-preview">
                          <FileText className="w-10 h-10" />
                          <span>{file.name.split('.').pop()?.toUpperCase()} Document</span>
                        </div>
                      )}
                    </div>
                    <div className="preview-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <button 
                      type="button" 
                      className="remove-preview"
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="kb-ticket-footer">
            <div className="kb-footer-meta">
              <div className="kb-meta-dot">
                <div className="pulse-dot-green" />
                <span>Technical specialists available online</span>
              </div>
            </div>
            <div className="kb-footer-btns">
              <button type="button" onClick={onClose} className="kb-btn-cancel">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="kb-btn-submit">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Assistance Request <Send className="w-4 h-4 ml-1" /></>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;
