import React, { useState } from 'react';
import { 
  X, MessageSquare, Star, Send, 
  ThumbsUp, ThumbsDown, Info, AlertTriangle,
  Lightbulb, Loader2, CheckCircle2 
} from 'lucide-react';
import { submitPortalFeedback } from '../../../lib/support';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

const FeedbackModal: React.FC<Props> = ({ onClose }) => {
  const { user } = useAuth();
  const [type, setType] = useState<'suggestion' | 'complaint' | 'compliment' | 'bug_report' | 'other'>('suggestion');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPortalFeedback({
        user_id: user.id,
        type,
        subject,
        message,
        rating,
        page_url: window.location.href
      });
      setSuccess(true);
      toast.success('Feedback submitted! Thank you.');
      setTimeout(onClose, 2500);
    } catch (err) {
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="kb-modal-overlay">
        <div className="kb-ticket-page-card animate-in fade-in zoom-in duration-300" style={{ maxWidth: '500px', textAlign: 'center', padding: '4rem 2rem' }}>
          <div className="success-icon-wrapper" style={{ margin: '0 auto 1.5rem' }}>
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Thank You!</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Your feedback has been sent to our development team. We appreciate your help in making the portal better.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kb-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kb-ticket-page-card animate-in fade-in zoom-in duration-300" style={{ maxWidth: '650px' }}>
        <button onClick={onClose} className="kb-modal-close-icon">
          <X className="w-5 h-5" />
        </button>

        <div className="kb-ticket-header" style={{ padding: '2rem 2.5rem' }}>
          <div className="kb-modal-header-content">
            <div className="kb-title-icon" style={{ background: '#fffbeb', color: '#f59e0b', border: '1px solid #fef3c7' }}>
              <Star className="w-7 h-7 fill-current" />
            </div>
            <div>
              <h1>Share Portal Feedback</h1>
              <p>Help us improve your experience with the Admission Desk Portal</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="kb-ticket-form" style={{ padding: '2rem 2.5rem' }}>
          <div className="kb-input-group">
            <label>Feedback Category</label>
            <div className="feedback-type-grid">
              {[
                { id: 'suggestion', icon: Lightbulb, label: 'Suggestion' },
                { id: 'complaint', icon: ThumbsDown, label: 'Complaint' },
                { id: 'compliment', icon: ThumbsUp, label: 'Compliment' },
                { id: 'bug_report', icon: AlertTriangle, label: 'Bug Report' },
                { id: 'other', icon: Info, label: 'Other' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`feedback-type-btn ${type === item.id ? 'active' : ''}`}
                  onClick={() => setType(item.id as any)}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="kb-input-group">
            <label>Rating</label>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className={`star-btn ${rating >= s ? 'active' : ''}`}
                >
                  <Star className={`w-6 h-6 ${rating >= s ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="kb-input-group">
            <label><span>*</span> Subject</label>
            <input 
              type="text" 
              placeholder="Brief summary of your feedback" 
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
              className="kb-main-input"
            />
          </div>

          <div className="kb-input-group">
            <label><span>*</span> Your Message</label>
            <textarea 
              placeholder="Tell us what's on your mind..." 
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              rows={4}
              className="kb-main-textarea"
            />
          </div>

          <div className="kb-ticket-footer">
            <button type="button" onClick={onClose} className="kb-btn-cancel">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="kb-btn-submit">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send Feedback <Send className="w-4 h-4 ml-1" /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
