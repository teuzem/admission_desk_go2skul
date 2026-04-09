const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://xfbswxuoauroagbvcrxk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmYnN3eHVvYXVyb2FnYnZjcnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODEyNDAsImV4cCI6MjA4ODk1NzI0MH0.NGdc1Rs7ym7d4uO32-lgpmF6xQuCpxSoxeArLJWd0DQ';

const files = [
  { local: 'public/News posts/edited_study_abroad_poster.png', remote: 'study-in-canada-2026.png' },
  { local: 'public/News posts/output_Study_in_Malta_2026_updated.png', remote: 'study-in-malta-2026.png' },
  { local: 'public/News posts/Visa process Schenghen zone Rhoda webinar EN.png', remote: 'visa-process-schengen-webinar.png' },
];

async function upload() {
  for (const file of files) {
    const filePath = path.resolve(__dirname, file.local);
    const fileBuffer = fs.readFileSync(filePath);
    
    console.log(`Uploading ${file.remote}...`);
    
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/news-assets/${file.remote}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: fileBuffer,
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`Failed to upload ${file.remote}: ${res.status} - ${text}`);
    } else {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/news-assets/${file.remote}`;
      console.log(`✓ Uploaded: ${publicUrl}`);
    }
  }
}

upload().catch(console.error);
