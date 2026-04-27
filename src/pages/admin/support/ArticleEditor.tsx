import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, Save, Eye, Code, Image as ImageIcon, Link as LinkIcon,
  Undo, Redo, RotateCcw, RotateCw, Replace as ReplaceIcon,
  ChevronDown, Loader2, Globe, Lock, AlertCircle, FileText,
  Settings, Search, Smartphone, Monitor, Layout, Type,
  Hash, List, Bold, Italic, Quote, Terminal, FileCode,
  ArrowLeft, ArrowRight, Share2, Info, CheckCircle2,
  Calendar, User as UserIcon, Tag, BarChart3, Clock,
  ExternalLink, Facebook, Linkedin, Twitter, Sparkles,
  Underline, Strikethrough, Palette, Video, Plus,
  Film, Music, MoreHorizontal, ChevronRight, Download,
  Minus, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Table as TableIcon, File as FileIcon, Paperclip, Type as TypeIcon,
  Subscript, Superscript, Outdent, Indent, Search as SearchIcon, Printer,
  ListRestart, Smile, Hash as HashIcon, Square, CheckSquare
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { uploadKbMedia } from '../../../lib/support';
import { KbCategoryRow } from '../../../types/database';
import toast from 'react-hot-toast';
import './CmsEditor.css';

interface Props {
  article?: any;
  categories: KbCategoryRow[];
  onClose: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const TEXT_COLORS = [
  '#0f172a', '#334155', '#64748b', '#94a3b8', // Slates
  '#ef4444', '#f97316', '#f59e0b', '#eab308', // Warm
  '#84cc16', '#22c55e', '#10b981', '#06b6d4', // Cool
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', // Blues/Purples
  '#d946ef', '#ec4899', '#f43f5e', '#78716c'  // Pink/Stone
];

const HIGHLIGHT_COLORS = [
  '#fef3c7', '#fef9c3', '#ecfdf5', '#f0fdf4', // Light Yellow/Green
  '#eff6ff', '#f5f3ff', '#fdf2f8', '#fff7ed', // Light Blue/Purple/Pink
  '#ffedd5', '#fee2e2', '#f1f5f9', '#ffffff'  // Light Orange/Red/Gray/White
];

const SYMBOLS = ['©', '®', '™', '§', '¶', '†', '‡', '•', '‣', '…', '‰', '′', '″', '‹', '›', '«', '»', '←', '↑', '→', '↓', '↔', '↕', '⇐', '⇑', '⇒', '⇓', '⇔', '⇕', '±', '×', '÷', '√', '∞', '≈', '≠', '≤', '≥', '∫', '∑', 'π', '∆', 'Ω', 'μ', '€', '£', '¥', '¢', '¤', '¿', '¡', '∑', '∏', '√', '∝', '∞', '∠', '∧', '∨', '∩', '∪', '∫', '∬', '∭', '∮', '∯', '∰', '∴', '∵', '∶', '∷', '∼', '∽', '≅', '≈', '≌', '≝', '≞', '≟', '≠', '≡', '≢', '≣', '≤', '≥', '≦', '≧', '≨', '≩', '≪', '≫', '≬', '≭', '≮', '≯', '≰', '≱', '≲', '≳', '≴', '≵', '≶', '≷', '≸', '≹', '≺', '≻', '≼', '≽', '≾', '≿', '⊀', '⊁', '⊂', '⊃', '⊄', '⊅', '⊆', '⊇', '⊈', '⊉', '⊊', '⊋', '⊌', '⊍', '⊎', '⊏', '⊐', '⊑', '⊒', '⊓', '⊔', '⊕', '⊖', '⊗', '⊘', '⊙', '⊚', '⊛', '⊜', '⊝', '⊞', '⊟', '⊠', '⊡', '⊢', '⊣', '⊤', '⊥', '⊦', '⊧', '⊨', '⊩', '⊪', '⊫', '⊬', '⊭', '⊮', '⊯', '⊰', '⊱', '⊲', '⊳', '⊴', '⊵', '⊶', '⊷', '⊸', '⊹', '⊺', '⊻', '⊼', '⊽', '⊾', '⊿', '⋀', '⋁', '⋂', '⋃', '⋄', '⋅', '⋆', '⋇', '⋈', '⋉', '⋊', '⋋', '⋌', '⋍', '⋎', '⋏', '⋐', '⋑', '⋒', '⋓', '⋔', '⋕', '⋖', '⋗', '⋘', '⋙', '⋚', '⋛', '⋜', '⋝', '⋞', '⋟', '⋠', '⋡', '⋢', '⋣', '⋤', '⋥', '⋦', '⋧', '⋨', '⋩', '⋪', '⋫', '⋬', '⋭', '⋮', '⋯', '⋰', '⋱', '⋲', '⋳', '⋴', '⋵', '⋶', '⋷', '⋸', '⋹', '⋺', '⋻', '⋼', '⋽', '⋾', '⋿'];
const EMOJIS = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠', '🤥', '😶', '😶‍🌫️', '😐', '😑', '😬', '🫨', '🫠', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🫥', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😻', '😼', '😽', '🙀', '😿', '😾', '🚀', '🔥', '✨', '💡', '✅', '❌', '⚠️', '🛡️', '⚡', '🌟', '💎', '🎉', '🏆', '🔔', '📌', '❤️', '👍', '💻', '🌍'];
const SPECIAL_CHARS = [...SYMBOLS, ...EMOJIS];

const ArticleEditor: React.FC<Props> = ({ article, categories, onClose }) => {
  // --- Core State ---
  const [title, setTitle] = useState(article?.title || '');
  const [slug, setSlug] = useState(article?.slug || '');
  const [content, setContent] = useState(article?.content || '');
  const [excerpt, setExcerpt] = useState(article?.excerpt || '');
  const [categoryId, setCategoryId] = useState(article?.category_id || categories[0]?.id || '');
  const [status, setStatus] = useState(article?.status || 'draft');
  const [featuredImage, setFeaturedImage] = useState(article?.featured_image_url || '');
  const [tags, setTags] = useState<string[]>(article?.tags || []);
  const [tagInput, setTagInput] = useState('');
  
  // --- UI State ---
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [isCodeView, setIsCodeView] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'post' | 'seo' | 'media'>('post');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [author, setAuthor] = useState<{ name: string; avatar: string } | null>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<'text' | 'highlight' | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableConfig, setTableConfig] = useState({ rows: 3, cols: 3, hasHeader: true, striped: false });
  const [linkData, setLinkData] = useState({ url: '', text: '', target: '_blank' });
  const [fontSize, setFontSize] = useState('3');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findData, setFindData] = useState({ find: '', replace: '' });
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [showSpecialChars, setShowSpecialChars] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [lineHeight, setLineHeight] = useState('1.6');
  const [letterSpacing, setLetterSpacing] = useState('normal');

  // --- Refs ---
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Initial Content Load ---
  useEffect(() => {
    if (!isCodeView && editorRef.current && content && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content;
    }
  }, []);

  // --- Sync Code/Visual ---
  useEffect(() => {
    if (!isCodeView && editorRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, [isCodeView]);

  const handleVisualChange = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  // --- Derived ---
  const wordCount = useMemo(() => {
    const text = content.replace(/<[^>]*>?/gm, '');
    return text.trim().split(/\s+/).filter(x => x.length > 0).length;
  }, [content]);
  const readingTime = useMemo(() => Math.max(1, Math.ceil(wordCount / 200)), [wordCount]);

  // --- Logic ---
  useEffect(() => {
    const fetchAuthor = async () => {
      const targetId = article?.author_id || (await supabase.auth.getUser()).data.user?.id;
      if (targetId) {
        const { data } = await supabase.from('profiles').select('first_name, last_name, avatar_url').eq('id', targetId).single();
        if (data) setAuthor({ name: `${data.first_name} ${data.last_name}`, avatar: data.avatar_url || '' });
      }
    };
    fetchAuthor();
  }, [article]);
  
  // --- Auto-save to Local Storage ---
  useEffect(() => {
    const timer = setInterval(() => {
      const draft = { title, slug, content, excerpt, categoryId, tags, featuredImage };
      localStorage.setItem(`kb_draft_${article?.id || 'new'}`, JSON.stringify(draft));
      setLastAutoSave(new Date());
    }, 30000); // Every 30s
    return () => clearInterval(timer);
  }, [title, slug, content, excerpt, categoryId, tags, featuredImage, article?.id]);

  useEffect(() => { if (sidebarTab === 'media') fetchGallery(); }, [sidebarTab]);

  const fetchGallery = async () => {
    setLoadingGallery(true);
    const { data } = await supabase.from('kb_media').select('*').order('created_at', { ascending: false });
    setGallery(data || []);
    setLoadingGallery(false);
  };

  const handleMediaUpload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) return toast.error('File exceeds 50MB limit');
    setUploadingMedia(true);
    const tid = toast.loading(`Uploading ${file.name}...`);
    try {
      const url = await uploadKbMedia(file);
      toast.success('Uploaded', { id: tid });
      if (sidebarTab === 'media') fetchGallery();
      insertMedia(url, file.type, file.name, file.size);
    } catch { toast.error('Upload failed', { id: tid }); }
    finally { setUploadingMedia(false); }
  };

  const insertMedia = (url: string, type: string, name: string, size?: number) => {
    let html = '';
    if (type.startsWith('image/')) {
      html = `<img src="${url}" alt="${name}" class="kb-img" />`;
    } else if (type.startsWith('video/')) {
      html = `<div class="video-container" contenteditable="false"><video src="${url}" controls playsinline></video></div>`;
    } else {
      const sizeStr = size ? `${(size / 1024 / 1024).toFixed(2)} MB` : 'Document';
      html = `
        <a href="${url}" class="kb-doc-card" target="_blank" download="${name}" contenteditable="false">
          <div class="kb-doc-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <div class="kb-doc-info">
            <h5 style="margin:0">${name}</h5>
            <p style="margin:0">${type.split('/')[1]?.toUpperCase() || 'FILE'} • ${sizeStr}</p>
          </div>
          <svg style="margin-left: auto; color: #94a3b8" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </a><br/>
      `;
    }
    insertAtSelection(html);
  };

  const insertAtSelection = (html: string) => {
    if (isCodeView) {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = content.substring(0, start) + html + content.substring(end);
      setContent(val);
    } else {
      editorRef.current?.focus();
      document.execCommand('insertHTML', false, html);
      handleVisualChange();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/;
    const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(.+)/;
    const imageRegex = /\.(jpeg|jpg|gif|png|webp)$/i;

    if (youtubeRegex.test(text)) {
      e.preventDefault();
      const id = text.match(youtubeRegex)?.[1];
      const embedUrl = `https://www.youtube.com/embed/${id}`;
      insertAtSelection(`<div class="video-container" contenteditable="false"><iframe src="${embedUrl}" allowfullscreen></iframe></div><br/>`);
    } else if (vimeoRegex.test(text)) {
      e.preventDefault();
      const id = text.match(vimeoRegex)?.[1];
      const embedUrl = `https://player.vimeo.com/video/${id}`;
      insertAtSelection(`<div class="video-container" contenteditable="false"><iframe src="${embedUrl}" allowfullscreen></iframe></div><br/>`);
    } else if (imageRegex.test(text)) {
      e.preventDefault();
      insertAtSelection(`<img src="${text}" class="kb-img" /><br/>`);
    }
  };

  const execCommand = (command: string, value: string = '') => {
    if (isCodeView) {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = content.substring(start, end);
      let wrapper = '';
      
      switch (command) {
        case 'bold': wrapper = `<strong>${selected}</strong>`; break;
        case 'italic': wrapper = `<em>${selected}</em>`; break;
        case 'underline': wrapper = `<u>${selected}</u>`; break;
        case 'strikeThrough': wrapper = `<del>${selected}</del>`; break;
        case 'foreColor': wrapper = `<span style="color: ${value}">${selected}</span>`; break;
        case 'hiliteColor': wrapper = `<span style="background-color: ${value}">${selected}</span>`; break;
        case 'formatBlock': wrapper = `<${value}>${selected}</${value}>`; break;
        case 'createLink': wrapper = `<a href="${value}" target="_blank">${selected}</a>`; break;
        case 'fontSize': wrapper = `<span style="font-size: ${value === '1' ? '0.75rem' : value === '3' ? '1rem' : value === '5' ? '1.5rem' : '2rem'}">${selected}</span>`; break;
        default: break;
      }
      
      if (wrapper) {
        const newVal = content.substring(0, start) + wrapper + content.substring(end);
        setContent(newVal);
      }
    } else {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      handleVisualChange();
    }
  };

  const handleCustomLink = () => {
    if (!linkData.url) return;
    
    // Check if it's a media link (YouTube, Vimeo, etc.)
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/;
    const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(.+)/;
    
    if (youtubeRegex.test(linkData.url)) {
      const id = linkData.url.match(youtubeRegex)?.[1];
      const embedUrl = `https://www.youtube.com/embed/${id}`;
      const html = `<div class="video-container" contenteditable="false"><iframe src="${embedUrl}" allowfullscreen></iframe></div><br/>`;
      insertAtSelection(html);
    } else if (vimeoRegex.test(linkData.url)) {
      const id = linkData.url.match(vimeoRegex)?.[1];
      const embedUrl = `https://player.vimeo.com/video/${id}`;
      const html = `<div class="video-container" contenteditable="false"><iframe src="${embedUrl}" allowfullscreen></iframe></div><br/>`;
      insertAtSelection(html);
    } else {
      execCommand('createLink', linkData.url);
    }
    
    setShowLinkDialog(false);
    setLinkData({ url: '', text: '', target: '_blank' });
  };

  const applyCustomStyle = (property: string, value: string) => {
    if (isCodeView) {
      execCommand(property === 'color' ? 'foreColor' : property === 'backgroundColor' ? 'hiliteColor' : 'fontSize', value);
      return;
    }
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style[property as any] = value;
    
    try {
      range.surroundContents(span);
    } catch {
      // Fallback if selection spans multiple nodes
      document.execCommand(property === 'color' ? 'foreColor' : 'hiliteColor', false, value);
    }
    handleVisualChange();
  };

  const applyListStyle = (type: 'ul' | 'ol', style: string) => {
    execCommand(type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
    // Find the parent list and apply style
    setTimeout(() => {
      const selection = window.getSelection();
      let node = selection?.anchorNode;
      while (node && node.nodeName !== type.toUpperCase()) {
        node = node.parentNode;
      }
      if (node instanceof HTMLElement) {
        node.style.listStyleType = style;
      }
      handleVisualChange();
    }, 10);
  };

  const insertSpecialChar = (char: string) => {
    insertAtSelection(char);
    setShowSpecialChars(false);
  };

  const insertHR = (style: string) => {
    let hr = '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0;" />';
    if (style === 'dashed') hr = '<hr style="border: none; border-top: 2px dashed #e2e8f0; margin: 2rem 0;" />';
    if (style === 'dotted') hr = '<hr style="border: none; border-top: 3px dotted #cbd5e1; margin: 2rem 0;" />';
    if (style === 'gradient') hr = '<div style="height: 1px; background: linear-gradient(to right, transparent, #6366f1, transparent); margin: 3rem 0;"></div>';
    if (style === 'thick') hr = '<hr style="border: none; height: 4px; background: #f1f5f9; border-radius: 2px; margin: 2rem 0;" />';
    insertAtSelection(hr);
  };

  const insertTaskList = () => {
    const html = `<div style="display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem;"><input type="checkbox" style="margin-top: 0.25rem; width: 1.1rem; height: 1.1rem; accent-color: #6366f1;" /> <div contenteditable="true">Task...</div></div>`;
    insertAtSelection(html);
  };

  const handleFindReplace = (replaceMode: boolean = false) => {
    if (!findData.find) return;
    if (isCodeView) {
      const newVal = replaceMode 
        ? content.split(findData.find).join(findData.replace)
        : content; // Find doesn't do much in raw textarea without complex logic
      setContent(newVal);
    } else {
      // Use window.find for visual
      const found = (window as any).find(findData.find, false, false, true, false, true, false);
      if (found && replaceMode) {
        document.execCommand('insertHTML', false, findData.replace);
      } else if (!found) {
        toast.error('Not found');
      }
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: Inter, sans-serif; padding: 2rem; color: #0f172a; line-height: 1.6; }
              h1 { font-size: 2.5rem; margin-bottom: 1rem; }
              img { max-width: 100%; border-radius: 12px; }
              .kb-table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
              .kb-table th, .kb-table td { border: 1px solid #e2e8f0; padding: 12px; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <div>${content}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const insertConfiguredTable = () => {
    const { rows, cols, hasHeader, striped } = tableConfig;
    let html = `<table class="kb-table ${striped ? 'striped' : ''}" style="width:100%; border-collapse: collapse; margin: 1.5rem 0;">`;
    
    if (hasHeader) {
      html += '<thead style="background: #f8fafc;"><tr>';
      for (let i = 0; i < cols; i++) {
        html += `<th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-weight: 700;">Header ${i + 1}</th>`;
      }
      html += '</tr></thead>';
    }
    
    html += '<tbody>';
    for (let i = 0; i < rows; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        html += `<td style="border: 1px solid #e2e8f0; padding: 12px;">Cell ${i + 1}-${j + 1}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table><br/>';
    
    insertAtSelection(html);
    setShowTableDialog(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return toast.error('Title and Content required');
    setIsSaving(true);
    try {
      const payload = { title, slug, content, excerpt, category_id: categoryId, status, tags, featured_image_url: featuredImage, updated_at: new Date().toISOString() };
      if (article?.id) await supabase.from('kb_articles').update(payload).eq('id', article.id);
      else await supabase.from('kb_articles').insert([{ ...payload, author_id: (await supabase.auth.getUser()).data.user?.id }]);
      toast.success('Successfully published');
      onClose();
    } catch { toast.error('Failed to save'); } finally { setIsSaving(false); }
  };

  return (
    <div className="cms-editor-root">
      {/* Premium Header */}
      <div className="cms-editor-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button onClick={onClose} className="cms-format-btn"><ArrowLeft className="w-5 h-5" /></button>
          <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.75rem' }}>
            <button onClick={() => setViewMode('edit')} className={`cms-sidebar-tab ${viewMode === 'edit' ? 'active' : ''}`} style={{ padding: '0.4rem 1.25rem' }}>Edit</button>
            <button onClick={() => setViewMode('preview')} className={`cms-sidebar-tab ${viewMode === 'preview' ? 'active' : ''}`} style={{ padding: '0.4rem 1.25rem' }}>Preview</button>
          </div>
          <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
          <button 
            onClick={() => setIsCodeView(!isCodeView)} 
            className={`cms-format-btn ${isCodeView ? 'active' : ''}`}
            style={{ width: 'auto', padding: '0 1rem', fontSize: '0.7rem', fontWeight: 800, gap: '0.5rem' }}>
            {isCodeView ? <TypeIcon className="w-4 h-4" /> : <Code className="w-4 h-4" />}
            {isCodeView ? 'Visual Editor' : 'Code Editor'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" onClick={() => setStatus(status === 'published' ? 'draft' : 'published')}>
            {status === 'published' ? <Globe className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4" />}
            {status === 'published' ? 'Public' : 'Draft'}
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Publish Article
          </button>
        </div>
      </div>

      <div className="cms-editor-content">
        {/* Editor Main Canvas */}
        <div className="cms-editor-main" style={{ background: viewMode === 'preview' ? '#f1f5f9' : 'white' }}>
          {viewMode === 'edit' ? (
           <div className="cms-editor-canvas">
              <input className="cms-editor-title-input" placeholder="Untitled Article..." value={title} onChange={e => setTitle(e.target.value)} />
              
              <div className="cms-block-actions" style={{ position: 'sticky', top: '1rem', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '0.75rem', gap: '0.75rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'visible' }} onDragStart={(e) => e.preventDefault()}>
                {/* Row 1: Typography & Hierarchy */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', width: '100%', flexWrap: 'nowrap' }}>
                  <select className="cms-select" style={{ width: '120px', minWidth: '120px' }} value={fontFamily} onChange={e => { setFontFamily(e.target.value); execCommand('fontName', e.target.value); }}>
                    <option value="Inter">Inter</option>
                    <option value="'Roboto', sans-serif">Roboto</option>
                    <option value="'Open Sans', sans-serif">Open Sans</option>
                    <option value="'Montserrat', sans-serif">Montserrat</option>
                    <option value="'Poppins', sans-serif">Poppins</option>
                    <option value="'Lato', sans-serif">Lato</option>
                    <option value="'Raleway', sans-serif">Raleway</option>
                    <option value="'Nunito', sans-serif">Nunito</option>
                    <option value="'Playfair Display', serif">Playfair</option>
                    <option value="'Merriweather', serif">Merriweather</option>
                    <option value="'Lora', serif">Lora</option>
                    <option value="'Source Code Pro', monospace">Source Code</option>
                    <option value="'JetBrains Mono', monospace">JetBrains</option>
                  </select>

                  <select className="cms-select" style={{ width: '70px', minWidth: '70px' }} value={fontSize} onChange={e => { setFontSize(e.target.value); applyCustomStyle('fontSize', e.target.value); }}>
                    {['12px', '14px', '16px', '18px', '20px', '24px', '32px', '40px', '48px', '64px'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 0.25rem' }} />

                  <select className="cms-select" style={{ width: '60px', minWidth: '60px' }} value={lineHeight} onChange={e => { setLineHeight(e.target.value); applyCustomStyle('lineHeight', e.target.value); }}>
                    <option value="1">1.0</option>
                    <option value="1.4">1.4</option>
                    <option value="1.6">1.6</option>
                    <option value="2">2.0</option>
                  </select>

                  <select className="cms-select" style={{ width: '70px', minWidth: '70px' }} value={letterSpacing} onChange={e => { setLetterSpacing(e.target.value); applyCustomStyle('letterSpacing', e.target.value); }}>
                    <option value="normal">Normal</option>
                    <option value="0.5px">Tight</option>
                    <option value="1px">Wide</option>
                  </select>

                  <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 0.25rem' }} />

                  <select className="cms-select" style={{ width: '110px', minWidth: '110px' }} onChange={e => execCommand('formatBlock', e.target.value)}>
                    <option value="p">Paragraph</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                    <option value="blockquote">Quote</option>
                    <option value="pre">Code Block</option>
                  </select>

                  <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 0.25rem' }} />

                  <button className="cms-format-btn" onClick={() => execCommand('bold')} title="Bold"><Bold className="w-4 h-4" /></button>
                  <button className="cms-format-btn" onClick={() => execCommand('italic')} title="Italic"><Italic className="w-4 h-4" /></button>
                  <button className="cms-format-btn" onClick={() => execCommand('underline')} title="Underline"><Underline className="w-4 h-4" /></button>
                  <button className="cms-format-btn" onClick={() => execCommand('strikeThrough')} title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
                  
                  <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 0.25rem' }} />

                  <div style={{ position: 'relative' }}>
                    <button className={`cms-format-btn ${showColorPicker === 'text' ? 'active' : ''}`} onClick={() => setShowColorPicker(showColorPicker === 'text' ? null : 'text')} title="Text Color"><Palette className="w-4 h-4" /></button>
                    {showColorPicker === 'text' && (
                      <div className="cms-dialog-overlay" style={{ width: '180px', left: 0 }}>
                        <div className="cms-color-grid">
                          {TEXT_COLORS.map(c => <div key={c} className="cms-color-swatch" style={{ background: c }} onClick={() => { applyCustomStyle('color', c); setShowColorPicker(null); }} />)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ position: 'relative' }}>
                    <button className={`cms-format-btn ${showColorPicker === 'highlight' ? 'active' : ''}`} onClick={() => setShowColorPicker(showColorPicker === 'highlight' ? null : 'highlight')} title="Text Highlight"><Type className="w-4 h-4" /></button>
                    {showColorPicker === 'highlight' && (
                      <div className="cms-dialog-overlay" style={{ width: '180px', left: 0, zIndex: 1000 }}>
                        <div className="cms-color-grid">
                          {HIGHLIGHT_COLORS.map(c => <div key={c} className="cms-color-swatch" style={{ background: c }} onClick={() => { applyCustomStyle('backgroundColor', c); setShowColorPicker(null); }} />)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 0.125rem' }} />

                  {/* Symbols Picker */}
                  <div style={{ position: 'relative' }}>
                    <button className={`cms-format-btn ${showSymbolPicker ? 'active' : ''}`} onClick={() => setShowSymbolPicker(!showSymbolPicker)} title="Symbols"><HashIcon className="w-4 h-4" /></button>
                    {showSymbolPicker && (
                      <div className="cms-dialog-overlay" style={{ width: '320px', padding: '0.75rem', left: 0, top: '100%', marginTop: '0.5rem', zIndex: 1000 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Diverse Symbols</div>
                        <div className="cms-color-grid" style={{ gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                          {SYMBOLS.map(c => <div key={c} className="cms-char-swatch" onClick={() => { insertSpecialChar(c); setShowSymbolPicker(false); }} style={{ cursor: 'pointer', fontSize: '1.2rem' }}>{c}</div>)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Image/Video Icons */}
                  <button className="cms-format-btn" onClick={() => setSidebarTab('media')} title="Quick Image Library"><ImageIcon className="w-4 h-4" /></button>
                  <button className="cms-format-btn" onClick={() => document.getElementById('dir-vid-up-2')?.click()} title="Quick Video Upload"><Video className="w-4 h-4" /></button>

                  <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 0.125rem' }} />

                  {/* Emoji Picker (Remains here as requested) */}
                  <div style={{ position: 'relative' }}>
                    <button className={`cms-format-btn ${showEmojiPicker ? 'active' : ''}`} onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Emojis"><Smile className="w-4 h-4" /></button>
                    {showEmojiPicker && (
                      <div className="cms-dialog-overlay" style={{ width: '280px', padding: '0.75rem', left: 0, top: '100%', marginTop: '0.5rem', zIndex: 1000 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Emoji Universe</div>
                        <div className="cms-color-grid" style={{ gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                          {EMOJIS.map(c => <div key={c} className="cms-char-swatch" onClick={() => { insertSpecialChar(c); setShowEmojiPicker(false); }} style={{ cursor: 'pointer', fontSize: '1.2rem' }}>{c}</div>)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Alignment, Lists, Objects & Tools */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', width: '100%', flexWrap: 'nowrap' }}>
                  <button className="cms-format-btn" onClick={() => execCommand('justifyLeft')} title="Align Left"><AlignLeft className="w-4 h-4" /></button>
                  <button className="cms-format-btn" onClick={() => execCommand('justifyCenter')} title="Align Center"><AlignCenter className="w-4 h-4" /></button>
                  <button className="cms-format-btn" onClick={() => execCommand('justifyRight')} title="Align Right"><AlignRight className="w-4 h-4" /></button>
                  <button className="cms-format-btn" onClick={() => execCommand('justifyFull')} title="Justify"><AlignJustify className="w-4 h-4" /></button>

                  <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 0.25rem' }} />

                  <button className="cms-format-btn" onClick={() => execCommand('outdent')} title="Outdent"><Outdent className="w-4 h-4" /></button>
                  <button className="cms-format-btn" onClick={() => execCommand('indent')} title="Indent"><Indent className="w-4 h-4" /></button>
                  
                  <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 0.25rem' }} />

                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <select className="cms-select" style={{ width: '40px', padding: '0.25rem' }} onChange={e => applyListStyle('ul', e.target.value)}>
                      <option value="disc">●</option>
                      <option value="circle">○</option>
                      <option value="square">■</option>
                    </select>
                    <button className="cms-format-btn" onClick={() => execCommand('insertUnorderedList')}><List className="w-4 h-4" /></button>
                  </div>

                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <select className="cms-select" style={{ width: '40px', padding: '0.25rem' }} onChange={e => applyListStyle('ol', e.target.value)}>
                      <option value="decimal">1.</option>
                      <option value="lower-alpha">a.</option>
                      <option value="upper-roman">I.</option>
                    </select>
                    <button className="cms-format-btn" onClick={() => execCommand('insertOrderedList')}><ListOrdered className="w-4 h-4" /></button>
                  </div>

                  <button className="cms-format-btn" onClick={insertTaskList} title="Task List"><CheckSquare className="w-4 h-4" /></button>
                  
                  <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 0.25rem' }} />

                  <button className="cms-format-btn" onClick={() => setShowLinkDialog(!showLinkDialog)} title="Link"><LinkIcon className="w-4 h-4" /></button>
                  <button className="cms-format-btn" onClick={() => setShowTableDialog(!showTableDialog)} title="Table"><TableIcon className="w-4 h-4" /></button>
                  <button className="cms-format-btn" onClick={() => execCommand('insertHorizontalRule')} title="HR"><Minus className="w-4 h-4" /></button>

                  <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 0.25rem' }} />

                  <div style={{ position: 'relative' }}>
                    <button className={`cms-format-btn ${showSpecialChars ? 'active' : ''}`} onClick={() => setShowSpecialChars(!showSpecialChars)} title="All Special Characters"><MoreHorizontal className="w-4 h-4" /></button>
                    {showSpecialChars && (
                      <div className="cms-dialog-overlay" style={{ width: '280px', padding: '0.75rem', right: 0, left: 'auto', bottom: '100%', top: 'auto', marginBottom: '0.5rem', zIndex: 1000 }}>
                        <div className="cms-color-grid" style={{ gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
                          {SPECIAL_CHARS.slice(0, 48).map(c => <div key={c} className="cms-char-swatch" onClick={() => insertSpecialChar(c)} style={{ cursor: 'pointer', fontSize: '1.2rem' }}>{c}</div>)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ position: 'relative' }}>
                    <button className={`cms-format-btn ${showFindReplace ? 'active' : ''}`} onClick={() => setShowFindReplace(!showFindReplace)} title="Find"><SearchIcon className="w-4 h-4" /></button>
                    {showFindReplace && (
                      <div className="cms-dialog-overlay" style={{ width: '240px', right: 0, left: 'auto', bottom: '100%', top: 'auto', marginBottom: '0.5rem' }}>
                        <input className="cms-input" placeholder="Find..." value={findData.find} onChange={e => setFindData({ ...findData, find: e.target.value })} style={{ marginBottom: '0.5rem' }} />
                        <input className="cms-input" placeholder="Replace..." value={findData.replace} onChange={e => setFindData({ ...findData, replace: e.target.value })} style={{ marginBottom: '0.5rem' }} />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-secondary" style={{ flex: 1, fontSize: '0.7rem' }} onClick={() => handleFindReplace(false)}>Find</button>
                          <button className="btn-primary" style={{ flex: 1, fontSize: '0.7rem' }} onClick={() => handleFindReplace(true)}>Replace</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 0.25rem' }} />
                  <button className="cms-format-btn" onClick={() => execCommand('undo')} title="Undo"><Undo className="w-4 h-4" /></button>
                  <button className="cms-format-btn" onClick={() => execCommand('redo')} title="Redo"><Redo className="w-4 h-4" /></button>
                  <button className="cms-format-btn" onClick={() => execCommand('removeFormat')} title="Clear"><X className="w-4 h-4" /></button>
                </div>
              </div>

              <input id="dir-vid-up-2" type="file" accept="video/*" hidden onChange={e => e.target.files?.[0] && handleMediaUpload(e.target.files[0])} />

              {isCodeView ? (
                <textarea 
                  ref={textareaRef} 
                  className="article-textarea" 
                  value={content} 
                  onChange={e => setContent(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#1e293b', background: '#f8fafc' }}
                />
              ) : (
                <div 
                  ref={editorRef}
                  className="article-visual-canvas kb-article-render"
                  contentEditable
                  onInput={handleVisualChange}
                  onBlur={handleVisualChange}
                  onPaste={handlePaste}
                  spellCheck={false}
                  style={{ outline: 'none', minHeight: '500px', padding: '2rem 0' }}
                />
              )}
            </div>
          ) : (
            <div className="preview-container">
               <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', background: 'white', padding: '0.4rem', borderRadius: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <button onClick={() => setPreviewDevice('desktop')} className={`cms-format-btn ${previewDevice === 'desktop' ? 'active' : ''}`}><Monitor className="w-4 h-4" /></button>
                <button onClick={() => setPreviewDevice('mobile')} className={`cms-format-btn ${previewDevice === 'mobile' ? 'active' : ''}`}><Smartphone className="w-4 h-4" /></button>
              </div>
              <div className={previewDevice === 'mobile' ? 'mobile-frame' : 'kb-article-render'} style={previewDevice === 'desktop' ? { width: '840px', background: 'white', padding: '5rem', borderRadius: '2.5rem', boxShadow: '0 40px 100px rgba(0,0,0,0.1)' } : {}}>
                {featuredImage && <img src={featuredImage} alt="" className="kb-img" />}
                <h1 style={{ fontSize: previewDevice === 'mobile' ? '2.25rem' : '3.5rem' }}>{title || 'Untitled'}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem', color: '#64748b', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden' }}>{author?.avatar && <img src={author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                    <strong>{author?.name || 'Author'}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock className="w-4 h-4" /> {readingTime}m read</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar className="w-4 h-4" /> {new Date().toLocaleDateString()}</div>
                </div>
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="cms-editor-sidebar">
          <div className="cms-sidebar-tab-nav">
            <button className={`cms-sidebar-tab ${sidebarTab === 'post' ? 'active' : ''}`} onClick={() => setSidebarTab('post')}>Article</button>
            <button className={`cms-sidebar-tab ${sidebarTab === 'seo' ? 'active' : ''}`} onClick={() => setSidebarTab('seo')}>SEO</button>
            <button className={`cms-sidebar-tab ${sidebarTab === 'media' ? 'active' : ''}`} onClick={() => setSidebarTab('media')}>Gallery</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sidebarTab === 'post' && (
              <>
                <div className="cms-sidebar-section">
                  <h4>Core Settings</h4>
                  <div className="cms-control-group">
                    <label className="cms-label">Category</label>
                    <select className="cms-select" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="cms-sidebar-section">
                  <h4>Featured Cover</h4>
                  <div className="media-uploader-zone" onClick={() => document.getElementById('feat-up-2')?.click()}>
                    {featuredImage ? <img src={featuredImage} alt="" style={{ width: '100%', borderRadius: '1rem' }} /> : <div><ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-20" /><p style={{ fontSize: '0.7rem', fontWeight: 800 }}>Upload Cover</p></div>}
                    <input id="feat-up-2" type="file" hidden onChange={e => e.target.files?.[0] && handleMediaUpload(e.target.files[0])} />
                  </div>
                </div>
                <div className="cms-sidebar-section">
                  <h4>Tags</h4>
                  <div className="cms-tag-input-wrap">
                    {tags.map(t => <span key={t} className="cms-tag">{t} <X className="w-3 h-3 cms-tag-remove" onClick={() => setTags(tags.filter(x => x !== t))} /></span>)}
                    <input className="cms-tag-field" placeholder="Tag..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && tagInput.trim() && (setTags([...tags, tagInput.trim()]), setTagInput(''))} />
                  </div>
                </div>
              </>
            )}

            {sidebarTab === 'seo' && (
              <div className="cms-sidebar-section">
                <h4>Search Preview</h4>
                <div className="seo-preview-card">
                  <div className="seo-preview-url"><Globe className="w-3 h-3" /> admissiondesk.online › {slug || 'your-slug'}</div>
                  <div className="seo-preview-title">{title || 'Your Article Title'}</div>
                  <div className="seo-preview-desc">{excerpt || 'This is how your article will appear in search results. Add a compelling meta summary to improve click-through rates.'}</div>
                </div>

                <div className="cms-control-group" style={{ marginTop: '2rem' }}>
                  <label className="cms-label">URL Slug</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      className="cms-input" 
                      value={slug} 
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                      placeholder="article-url-slug"
                    />
                    <button 
                      className="cms-format-btn" 
                      onClick={() => setSlug(title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, ''))}
                      title="Generate from Title">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                    </button>
                  </div>
                  <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.4rem' }}>The unique URL path for this article.</p>
                </div>

                <div className="cms-control-group">
                  <label className="cms-label">Meta Summary (Excerpt)</label>
                  <textarea 
                    className="cms-input" 
                    rows={4} 
                    value={excerpt} 
                    onChange={e => setExcerpt(e.target.value)} 
                    placeholder="Briefly describe what this article is about..."
                  />
                  <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.4rem' }}>Recommended: 150-160 characters.</p>
                </div>

                <div className="cms-control-group">
                  <label className="cms-label">SEO Keywords</label>
                  <div className="cms-tag-input-wrap">
                    {tags.map(t => <span key={t} className="cms-tag">{t} <X className="w-3 h-3 cms-tag-remove" onClick={() => setTags(tags.filter(x => x !== t))} /></span>)}
                    <input className="cms-tag-field" placeholder="Add keyword..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && tagInput.trim() && (setTags([...tags, tagInput.trim()]), setTagInput(''))} />
                  </div>
                </div>
              </div>
            )}

            {sidebarTab === 'media' && (
              <div className="cms-sidebar-section">
                <h4>Asset Library</h4>
                <button className="btn-secondary" style={{ width: '100%', marginBottom: '1.5rem' }} onClick={() => document.getElementById('lib-up-2')?.click()}>
                  <Plus className="w-4 h-4" /> Upload Asset
                </button>
                <input id="lib-up-2" type="file" hidden onChange={e => e.target.files?.[0] && handleMediaUpload(e.target.files[0])} />
                
                {loadingGallery ? <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div> : (
                  <div className="cms-media-grid">
                    {gallery.map(item => (
                      <div key={item.id} className="cms-media-item" onClick={() => insertMedia(item.url, item.type, item.name, item.size)}>
                        {item.type.startsWith('image/') ? <img src={item.url} alt="" /> : item.type.startsWith('video/') ? <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileIcon className="w-6 h-6 text-indigo-400" /></div>}
                        <div className="cms-media-badge">{item.type.split('/')[1]?.substring(0, 4).toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="floating-cms-toolbar">
         <button><BarChart3 className="w-4 h-4" /> {wordCount} Words</button>
         <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
         <button><Clock className="w-4 h-4" /> {readingTime}m Read</button>
         <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
         <button onClick={() => fetchGallery()}><Download className="w-4 h-4" /> {gallery.length} Assets</button>
         {lastAutoSave && (
           <>
             <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
             <button style={{ color: '#10b981', gap: '0.4rem' }}><CheckCircle2 className="w-3.5 h-3.5" /> Draft Saved {lastAutoSave.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</button>
           </>
         )}
      </div>
    </div>
  );
};

export default ArticleEditor;
