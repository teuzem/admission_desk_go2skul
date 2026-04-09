import { Instagram, Linkedin, Youtube, Facebook } from 'lucide-react'

export default function AdmissionFooter() {
  return (
    <footer className="admission-footer">
      <a href="https://instagram.com/admission-desk-portal" target="_blank" rel="noopener noreferrer" title="Instagram">
        <Instagram size={22} />
      </a>
      <a href="https://linkedin.com/company/admission-desk-portal" target="_blank" rel="noopener noreferrer" title="LinkedIn">
        <Linkedin size={22} />
      </a>
      <a href="https://youtube.com/@admission-desk-portal" target="_blank" rel="noopener noreferrer" title="YouTube">
        <Youtube size={22} />
      </a>
      <a href="https://x.com/admission_desk" target="_blank" rel="noopener noreferrer" title="X">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </a>
      <a href="https://facebook.com/admissiondeskportal" target="_blank" rel="noopener noreferrer" title="Facebook">
        <Facebook size={22} />
      </a>
    </footer>
  )
}
